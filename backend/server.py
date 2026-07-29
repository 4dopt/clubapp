from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import string
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
ADMIN_PIN = os.environ.get('ADMIN_PIN', '123456')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============= Helpers =============
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_member_id() -> str:
    n = secrets.randbelow(900000) + 100000
    return f"PG-{n}"


def gen_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def compute_tier(lifetime: int) -> str:
    if lifetime >= 5000:
        return "Platinum"
    if lifetime >= 1000:
        return "Gold"
    return "Silver"


# ============= Models =============
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: str
    member_id: str
    tier: str = "Silver"
    points_balance: int = 0
    lifetime_points: int = 0
    joined_at: str = Field(default_factory=now_iso)
    suspended: bool = False


class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    points_cost: int
    category: str
    image_url: str
    active: bool = True


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: Literal["earn", "redeem", "adjust"]
    points: int
    title: str
    description: str = ""
    reward_id: Optional[str] = None
    redemption_code: Optional[str] = None
    used: bool = False
    used_at: Optional[str] = None
    used_by: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    by_admin: bool = False


class RequestOtpIn(BaseModel):
    phone: str


class VerifyOtpIn(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None


class AddPointsIn(BaseModel):
    points: int
    title: str = "Visit at PlayGolf"
    description: str = ""


class RedeemIn(BaseModel):
    reward_id: str


class AdminLoginIn(BaseModel):
    pin: str


class AdminCreditPointsIn(BaseModel):
    member_id: str  # PG-XXXXXX
    points: int
    title: str = "Visit credited by staff"


class AdminVerifyRedemptionIn(BaseModel):
    code: str


class AdminUpdateMemberIn(BaseModel):
    name: Optional[str] = None
    points_balance: Optional[int] = None
    lifetime_points: Optional[int] = None
    tier: Optional[str] = None
    suspended: Optional[bool] = None


class AdminRewardIn(BaseModel):
    title: str
    description: str
    points_cost: int
    category: str
    image_url: str
    active: bool = True


class AdminRewardPatchIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    points_cost: Optional[int] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None


# ============= Member auth =============
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    new_tier = compute_tier(user.get("lifetime_points", 0))
    if user.get("tier") != new_tier:
        await db.users.update_one({"id": user["id"]}, {"$set": {"tier": new_tier}})
        user["tier"] = new_tier
    return user


# ============= Admin auth =============
async def require_admin(x_admin_token: Optional[str] = Header(None)) -> dict:
    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Missing admin token")
    session = await db.admin_sessions.find_one({"token": x_admin_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return session


# ============= Member routes =============
@api_router.get("/")
async def root():
    return {"message": "PlayGolf API", "ok": True}


@api_router.post("/auth/request-otp")
async def request_otp(payload: RequestOtpIn):
    phone = payload.phone.strip()
    if len(phone) < 6:
        raise HTTPException(status_code=400, detail="Invalid phone")
    otp = "0000"
    await db.otps.update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "otp": otp, "created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "dev_otp": otp, "message": "OTP sent (mock). Use 0000."}


@api_router.post("/auth/verify-otp")
async def verify_otp(payload: VerifyOtpIn):
    phone = payload.phone.strip()
    record = await db.otps.find_one({"phone": phone}, {"_id": 0})
    if not record or record.get("otp") != payload.otp.strip():
        raise HTTPException(status_code=401, detail="Invalid OTP")

    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        starter = 250
        user_obj = User(
            phone=phone,
            name=(payload.name or "Member").strip() or "Member",
            member_id=gen_member_id(),
            tier="Silver",
            points_balance=starter,
            lifetime_points=starter,
        )
        user = user_obj.dict()
        await db.users.insert_one(User(**user).dict())
        welcome = Transaction(
            user_id=user["id"],
            type="earn",
            points=starter,
            title="Welcome bonus",
            description="Thanks for joining PlayGolf",
        )
        await db.transactions.insert_one(welcome.dict())

    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Account suspended")

    token = secrets.token_urlsafe(32)
    await db.sessions.insert_one({"token": token, "user_id": user["id"], "created_at": now_iso()})
    await db.otps.delete_one({"phone": phone})
    user.pop("_id", None)
    return {"token": token, "user": user}


@api_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/me/name")
async def update_name(payload: dict, user: dict = Depends(get_current_user)):
    new_name = (payload.get("name") or "").strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name required")
    await db.users.update_one({"id": user["id"]}, {"$set": {"name": new_name}})
    user["name"] = new_name
    return user


@api_router.get("/rewards")
async def list_rewards(category: Optional[str] = None):
    q = {"active": True}
    if category and category != "all":
        q["category"] = category
    rewards = await db.rewards.find(q, {"_id": 0}).sort("points_cost", 1).to_list(200)
    return rewards


@api_router.get("/rewards/{reward_id}")
async def get_reward(reward_id: str):
    reward = await db.rewards.find_one({"id": reward_id}, {"_id": 0})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    return reward


@api_router.post("/redeem")
async def redeem(payload: RedeemIn, user: dict = Depends(get_current_user)):
    reward = await db.rewards.find_one({"id": payload.reward_id}, {"_id": 0})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if not reward.get("active", True):
        raise HTTPException(status_code=400, detail="Reward not available")
    cost = int(reward["points_cost"])
    if user["points_balance"] < cost:
        raise HTTPException(status_code=400, detail="Not enough points")

    new_balance = user["points_balance"] - cost
    await db.users.update_one({"id": user["id"]}, {"$set": {"points_balance": new_balance}})

    code = gen_code(8)
    txn = Transaction(
        user_id=user["id"],
        type="redeem",
        points=cost,
        title=reward["title"],
        description=reward.get("description", ""),
        reward_id=reward["id"],
        redemption_code=code,
    )
    await db.transactions.insert_one(txn.dict())

    return {
        "ok": True,
        "redemption_code": code,
        "new_balance": new_balance,
        "reward": reward,
        "transaction": txn.dict(),
    }


@api_router.get("/transactions")
async def list_transactions(user: dict = Depends(get_current_user)):
    txns = (
        await db.transactions.find({"user_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1).to_list(500)
    )
    return txns


@api_router.post("/points/add")
async def add_points(payload: AddPointsIn, user: dict = Depends(get_current_user)):
    pts = int(payload.points)
    if pts <= 0 or pts > 10000:
        raise HTTPException(status_code=400, detail="Invalid points")
    new_balance = user["points_balance"] + pts
    new_lifetime = user["lifetime_points"] + pts
    new_tier = compute_tier(new_lifetime)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"points_balance": new_balance, "lifetime_points": new_lifetime, "tier": new_tier}},
    )
    txn = Transaction(
        user_id=user["id"], type="earn", points=pts,
        title=payload.title or "Points earned", description=payload.description or "",
    )
    await db.transactions.insert_one(txn.dict())
    return {
        "ok": True, "new_balance": new_balance, "lifetime_points": new_lifetime,
        "tier": new_tier, "transaction": txn.dict(),
    }


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.sessions.delete_one({"token": token})
    return {"ok": True}


# ============= Admin routes =============
@api_router.post("/admin/login")
async def admin_login(payload: AdminLoginIn):
    if (payload.pin or "").strip() != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    token = secrets.token_urlsafe(32)
    await db.admin_sessions.insert_one({
        "token": token, "created_at": now_iso(), "actor": "staff",
    })
    return {"ok": True, "admin_token": token}


@api_router.post("/admin/logout")
async def admin_logout(x_admin_token: Optional[str] = Header(None)):
    if x_admin_token:
        await db.admin_sessions.delete_one({"token": x_admin_token})
    return {"ok": True}


@api_router.get("/admin/me")
async def admin_me(_: dict = Depends(require_admin)):
    return {"ok": True, "role": "staff"}


@api_router.post("/admin/credit-points")
async def admin_credit_points(payload: AdminCreditPointsIn, _: dict = Depends(require_admin)):
    pts = int(payload.points)
    if pts <= 0 or pts > 50000:
        raise HTTPException(status_code=400, detail="Invalid points")
    member_id = payload.member_id.strip().upper()
    user = await db.users.find_one({"member_id": member_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
    if user.get("suspended"):
        raise HTTPException(status_code=403, detail="Member is suspended")
    new_balance = user["points_balance"] + pts
    new_lifetime = user["lifetime_points"] + pts
    new_tier = compute_tier(new_lifetime)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"points_balance": new_balance, "lifetime_points": new_lifetime, "tier": new_tier}},
    )
    txn = Transaction(
        user_id=user["id"], type="earn", points=pts,
        title=payload.title or "Visit credited by staff",
        by_admin=True,
    )
    await db.transactions.insert_one(txn.dict())
    user.update({"points_balance": new_balance, "lifetime_points": new_lifetime, "tier": new_tier})
    return {"ok": True, "user": user, "transaction": txn.dict()}


@api_router.post("/admin/verify-redemption")
async def admin_verify_redemption(payload: AdminVerifyRedemptionIn, admin: dict = Depends(require_admin)):
    code = (payload.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Code required")
    txn = await db.transactions.find_one({"redemption_code": code}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Code not found")
    if txn.get("used"):
        # Already used — return info but don't fail; caller decides
        member = await db.users.find_one({"id": txn["user_id"]}, {"_id": 0})
        return {"ok": False, "already_used": True, "transaction": txn, "member": member}
    used_at = now_iso()
    await db.transactions.update_one(
        {"id": txn["id"]},
        {"$set": {"used": True, "used_at": used_at, "used_by": admin.get("token", "")[:8]}},
    )
    txn.update({"used": True, "used_at": used_at})
    member = await db.users.find_one({"id": txn["user_id"]}, {"_id": 0})
    return {"ok": True, "already_used": False, "transaction": txn, "member": member}


@api_router.get("/admin/members")
async def admin_list_members(q: Optional[str] = None, _: dict = Depends(require_admin)):
    query: dict = {}
    if q:
        q_clean = q.strip()
        # search by name (case-insensitive), phone, or member_id
        query = {
            "$or": [
                {"name": {"$regex": q_clean, "$options": "i"}},
                {"phone": {"$regex": q_clean, "$options": "i"}},
                {"member_id": {"$regex": q_clean, "$options": "i"}},
            ]
        }
    users = await db.users.find(query, {"_id": 0}).sort("joined_at", -1).to_list(500)
    return users


@api_router.get("/admin/members/{user_id}")
async def admin_get_member(user_id: str, _: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
    txns = (
        await db.transactions.find({"user_id": user_id}, {"_id": 0})
        .sort("created_at", -1).limit(50).to_list(50)
    )
    return {"user": user, "transactions": txns}


@api_router.patch("/admin/members/{user_id}")
async def admin_update_member(user_id: str, payload: AdminUpdateMemberIn, _: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
    update: dict = {}
    note_parts = []
    delta = 0
    if payload.name is not None:
        update["name"] = payload.name.strip()
    if payload.points_balance is not None:
        delta = int(payload.points_balance) - int(user["points_balance"])
        update["points_balance"] = int(payload.points_balance)
        if delta:
            note_parts.append(f"balance {'+' if delta>0 else ''}{delta}")
    if payload.lifetime_points is not None:
        update["lifetime_points"] = int(payload.lifetime_points)
    if payload.tier is not None and payload.tier in ("Silver", "Gold", "Platinum"):
        update["tier"] = payload.tier
    if payload.suspended is not None:
        update["suspended"] = bool(payload.suspended)
        note_parts.append("suspended" if payload.suspended else "activated")
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.users.update_one({"id": user_id}, {"$set": update})
    user.update(update)
    # simpler: record a manual adjust txn when balance set
    if note_parts:
        txn = Transaction(
            user_id=user_id, type="adjust",
            points=delta,
            title="Admin update", description=", ".join(note_parts), by_admin=True,
        )
        await db.transactions.insert_one(txn.dict())
    return user


async def get_old_balance(user_id: str) -> int:
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "points_balance": 1})
    return int(u.get("points_balance", 0)) if u else 0


@api_router.get("/admin/rewards")
async def admin_list_rewards(_: dict = Depends(require_admin)):
    rewards = await db.rewards.find({}, {"_id": 0}).sort("points_cost", 1).to_list(500)
    return rewards


@api_router.post("/admin/rewards")
async def admin_create_reward(payload: AdminRewardIn, _: dict = Depends(require_admin)):
    reward = Reward(**payload.dict())
    await db.rewards.insert_one(reward.dict())
    return reward.dict()


@api_router.patch("/admin/rewards/{reward_id}")
async def admin_update_reward(reward_id: str, payload: AdminRewardPatchIn, _: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields")
    res = await db.rewards.update_one({"id": reward_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reward not found")
    reward = await db.rewards.find_one({"id": reward_id}, {"_id": 0})
    return reward


@api_router.delete("/admin/rewards/{reward_id}")
async def admin_delete_reward(reward_id: str, _: dict = Depends(require_admin)):
    # soft delete — set inactive
    res = await db.rewards.update_one({"id": reward_id}, {"$set": {"active": False}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reward not found")
    return {"ok": True}


@api_router.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    total_members = await db.users.count_documents({})
    suspended = await db.users.count_documents({"suspended": True})
    # points issued today (sum of earn txns)
    pipeline_today_earn = [
        {"$match": {"type": "earn", "created_at": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}, "count": {"$sum": 1}}},
    ]
    today_earn = await db.transactions.aggregate(pipeline_today_earn).to_list(1)
    points_today = today_earn[0]["total"] if today_earn else 0
    visits_today = today_earn[0]["count"] if today_earn else 0
    # redemptions today
    pipeline_today_redeem = [
        {"$match": {"type": "redeem", "created_at": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}, "count": {"$sum": 1}}},
    ]
    today_redeem = await db.transactions.aggregate(pipeline_today_redeem).to_list(1)
    redemptions_today = today_redeem[0]["count"] if today_redeem else 0
    # 7-day stats
    week_pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$type", "total": {"$sum": "$points"}, "count": {"$sum": 1}}},
    ]
    week = {row["_id"]: row async for row in db.transactions.aggregate(week_pipeline)}
    # tier breakdown
    tier_pipeline = [{"$group": {"_id": "$tier", "count": {"$sum": 1}}}]
    tiers = {row["_id"]: row["count"] async for row in db.users.aggregate(tier_pipeline)}

    # recent activity (last 10 txns w/ user names)
    recent = []
    async for t in db.transactions.find({}, {"_id": 0}).sort("created_at", -1).limit(10):
        u = await db.users.find_one({"id": t.get("user_id")}, {"_id": 0, "name": 1, "member_id": 1})
        if u:
            t["member_name"] = u.get("name")
            t["member_id"] = u.get("member_id")
        recent.append(t)

    return {
        "total_members": total_members,
        "suspended": suspended,
        "points_issued_today": points_today,
        "visits_today": visits_today,
        "redemptions_today": redemptions_today,
        "week_earn_total": week.get("earn", {}).get("total", 0),
        "week_redeem_total": week.get("redeem", {}).get("total", 0),
        "tiers": {
            "Silver": tiers.get("Silver", 0),
            "Gold": tiers.get("Gold", 0),
            "Platinum": tiers.get("Platinum", 0),
        },
        "recent": recent,
    }


# ============= Seed =============
DEFAULT_REWARDS = [
    {
        "title": "Large Bucket of Range Balls",
        "description": "Enjoy a large bucket (100 balls) at the driving range.",
        "points_cost": 200, "category": "range",
        "image_url": "https://images.unsplash.com/photo-1526323610139-381ca0f77a12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHxnb2xmJTIwZHJpdmluZyUyMHJhbmdlJTIwYmFsbHN8ZW58MHx8fHwxNzgxNjE2OTc3fDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Unlimited Range Session (1 hour)",
        "description": "One hour of unlimited balls at our floodlit driving range.",
        "points_cost": 450, "category": "range",
        "image_url": "https://images.unsplash.com/photo-1526323610139-381ca0f77a12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHxnb2xmJTIwZHJpdmluZyUyMHJhbmdlJTIwYmFsbHN8ZW58MHx8fHwxNzgxNjE2OTc3fDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "9 Holes Green Fee",
        "description": "Complimentary 9-hole round at PlayGolf course (weekdays).",
        "points_cost": 800, "category": "course",
        "image_url": "https://images.unsplash.com/photo-1561251224-e393160cd769?crop=entropy&cs=srgb&fm=jpg&ixid=M3w8NjAzMjV8MHwxfHNlYXJjaHwxfHxnb2xmJTIwY2FydCUyMG9uJTIwY291cnNlfGVufDB8fHx8MTc4MTYxNjk5MXww&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "18 Holes Green Fee",
        "description": "A full 18-hole round on our championship course.",
        "points_cost": 1500, "category": "course",
        "image_url": "https://images.unsplash.com/photo-1561251224-e393160cd769?crop=entropy&cs=srgb&fm=jpg&ixid=M3w8NjAzMjV8MHwxfHNlYXJjaHwxfHxnb2xmJTIwY2FydCUyMG9uJTIwY291cnNlfGVufDB8fHx8MTc4MTYxNjk5MXww&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "10% Off Pro Shop",
        "description": "Save 10% on any apparel, balls, or accessories.",
        "points_cost": 300, "category": "proshop",
        "image_url": "https://images.unsplash.com/photo-1597369199842-f08ca157e015?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxnb2xmJTIwcHJvJTIwc2hvcCUyMGFwcGFyZWx8ZW58MHx8fHwxNzgxNjE2OTc3fDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Premium Golf Glove",
        "description": "Redeem a premium leather glove from the pro shop.",
        "points_cost": 1200, "category": "proshop",
        "image_url": "https://images.unsplash.com/photo-1597369199842-f08ca157e015?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxnb2xmJTIwcHJvJTIwc2hvcCUyMGFwcGFyZWx8ZW58MHx8fHwxNzgxNjE2OTc3fDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Clubhouse Cafe Meal",
        "description": "Any signature meal and beverage from the clubhouse cafe.",
        "points_cost": 600, "category": "cafe",
        "image_url": "https://images.unsplash.com/photo-1585418694458-dc80a5c20294?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBnb2xmJTIwY2x1Ymhvb3VzZSUyMHJlc3RhdXJhbnR8ZW58MHx8fHwxNzgxNjE2OTkxfDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Specialty Coffee & Pastry",
        "description": "Free specialty coffee with any pastry from the cafe.",
        "points_cost": 150, "category": "cafe",
        "image_url": "https://images.unsplash.com/photo-1585418694458-dc80a5c20294?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBnb2xmJTIwY2x1Ymhvb3VzZSUyMHJlc3RhdXJhbnR8ZW58MHx8fHwxNzgxNjE2OTkxfDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "30-min Lesson with Pro",
        "description": "Half-hour private lesson with a PGA-certified instructor.",
        "points_cost": 1800, "category": "lessons",
        "image_url": "https://images.unsplash.com/photo-1709525616662-8d9f9a995ceb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxnb2xmJTIwY291cnNlJTIwZ29sZGVuJTIwaG91cnxlbnwwfHx8fDE3ODE2MTY5Nzd8MA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Full 1-Hour Lesson",
        "description": "Comprehensive 60-minute swing analysis & coaching.",
        "points_cost": 3200, "category": "lessons",
        "image_url": "https://images.unsplash.com/photo-1709525616662-8d9f9a995ceb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxnb2xmJTIwY291cnNlJTIwZ29sZGVuJTIwaG91cnxlbnwwfHx8fDE3ODE2MTY5Nzd8MA&ixlib=rb-4.1.0&q=85",
    },
]


async def seed_rewards():
    existing_titles = set()
    async for r in db.rewards.find({}, {"_id": 0, "title": 1}):
        existing_titles.add(r["title"])
    for r in DEFAULT_REWARDS:
        if r["title"] in existing_titles:
            continue
        await db.rewards.insert_one(Reward(**r).dict())


@api_router.post("/seed")
async def seed_endpoint():
    await seed_rewards()
    count = await db.rewards.count_documents({})
    return {"ok": True, "rewards_count": count}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    try:
        await seed_rewards()
        logger.info("Seeded rewards on startup")
    except Exception as e:
        logger.error(f"Seed failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
