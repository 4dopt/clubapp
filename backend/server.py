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
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============= Models =============
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


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: str
    member_id: str
    tier: str = "Silver"
    points_balance: int = 0
    lifetime_points: int = 0
    joined_at: str = Field(default_factory=now_iso)


class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    points_cost: int
    category: str  # range | course | proshop | cafe | lessons
    image_url: str
    active: bool = True


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: Literal["earn", "redeem"]
    points: int  # positive
    title: str
    description: str = ""
    reward_id: Optional[str] = None
    redemption_code: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


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


# ============= Auth helpers =============
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
    # recompute tier on fetch (cheap)
    new_tier = compute_tier(user.get("lifetime_points", 0))
    if user.get("tier") != new_tier:
        await db.users.update_one({"id": user["id"]}, {"$set": {"tier": new_tier}})
        user["tier"] = new_tier
    return user


# ============= Routes =============
@api_router.get("/")
async def root():
    return {"message": "PlayGolf API", "ok": True}


@api_router.post("/auth/request-otp")
async def request_otp(payload: RequestOtpIn):
    phone = payload.phone.strip()
    if len(phone) < 6:
        raise HTTPException(status_code=400, detail="Invalid phone")
    # MOCK: fixed OTP for dev, return it for easy testing
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
        # Create new user with starter points so the experience feels alive
        starter_points = 250
        user_obj = User(
            phone=phone,
            name=(payload.name or "Member").strip() or "Member",
            member_id=gen_member_id(),
            tier="Silver",
            points_balance=starter_points,
            lifetime_points=starter_points,
        )
        user = user_obj.dict()
        await db.users.insert_one(User(**user).dict())
        # seed welcome transaction
        welcome = Transaction(
            user_id=user["id"],
            type="earn",
            points=starter_points,
            title="Welcome bonus",
            description="Thanks for joining PlayGolf",
        )
        await db.transactions.insert_one(welcome.dict())

    # Create session token
    token = secrets.token_urlsafe(32)
    await db.sessions.insert_one({
        "token": token,
        "user_id": user["id"],
        "created_at": now_iso(),
    })

    # delete otp
    await db.otps.delete_one({"phone": phone})

    # Strip _id (shouldn't be there since projection used, but be safe)
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
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"points_balance": new_balance}},
    )

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
        .sort("created_at", -1)
        .to_list(500)
    )
    return txns


@api_router.post("/points/add")
async def add_points(payload: AddPointsIn, user: dict = Depends(get_current_user)):
    """Demo endpoint — staff would scan member QR and add points.
    For this app we let the member self-trigger so the flow can be demoed."""
    pts = int(payload.points)
    if pts <= 0 or pts > 10000:
        raise HTTPException(status_code=400, detail="Invalid points")
    new_balance = user["points_balance"] + pts
    new_lifetime = user["lifetime_points"] + pts
    new_tier = compute_tier(new_lifetime)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "points_balance": new_balance,
            "lifetime_points": new_lifetime,
            "tier": new_tier,
        }},
    )
    txn = Transaction(
        user_id=user["id"],
        type="earn",
        points=pts,
        title=payload.title or "Points earned",
        description=payload.description or "",
    )
    await db.transactions.insert_one(txn.dict())
    return {
        "ok": True,
        "new_balance": new_balance,
        "lifetime_points": new_lifetime,
        "tier": new_tier,
        "transaction": txn.dict(),
    }


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.sessions.delete_one({"token": token})
    return {"ok": True}


# ============= Seed =============
DEFAULT_REWARDS = [
    {
        "title": "Large Bucket of Range Balls",
        "description": "Enjoy a large bucket (100 balls) at the driving range.",
        "points_cost": 200,
        "category": "range",
        "image_url": "https://images.unsplash.com/photo-1526323610139-381ca0f77a12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHxnb2xmJTIwZHJpdmluZyUyMHJhbmdlJTIwYmFsbHN8ZW58MHx8fHwxNzgxNjE2OTc3fDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Unlimited Range Session (1 hour)",
        "description": "One hour of unlimited balls at our floodlit driving range.",
        "points_cost": 450,
        "category": "range",
        "image_url": "https://images.unsplash.com/photo-1526323610139-381ca0f77a12?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHxnb2xmJTIwZHJpdmluZyUyMHJhbmdlJTIwYmFsbHN8ZW58MHx8fHwxNzgxNjE2OTc3fDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "9 Holes Green Fee",
        "description": "Complimentary 9-hole round at PlayGolf course (weekdays).",
        "points_cost": 800,
        "category": "course",
        "image_url": "https://images.unsplash.com/photo-1561251224-e393160cd769?crop=entropy&cs=srgb&fm=jpg&ixid=M3w8NjAzMjV8MHwxfHNlYXJjaHwxfHxnb2xmJTIwY2FydCUyMG9uJTIwY291cnNlfGVufDB8fHx8MTc4MTYxNjk5MXww&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "18 Holes Green Fee",
        "description": "A full 18-hole round on our championship course.",
        "points_cost": 1500,
        "category": "course",
        "image_url": "https://images.unsplash.com/photo-1561251224-e393160cd769?crop=entropy&cs=srgb&fm=jpg&ixid=M3w8NjAzMjV8MHwxfHNlYXJjaHwxfHxnb2xmJTIwY2FydCUyMG9uJTIwY291cnNlfGVufDB8fHx8MTc4MTYxNjk5MXww&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "10% Off Pro Shop",
        "description": "Save 10% on any apparel, balls, or accessories.",
        "points_cost": 300,
        "category": "proshop",
        "image_url": "https://images.unsplash.com/photo-1597369199842-f08ca157e015?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxnb2xmJTIwcHJvJTIwc2hvcCUyMGFwcGFyZWx8ZW58MHx8fHwxNzgxNjE2OTc3fDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Premium Golf Glove",
        "description": "Redeem a premium leather glove from the pro shop.",
        "points_cost": 1200,
        "category": "proshop",
        "image_url": "https://images.unsplash.com/photo-1597369199842-f08ca157e015?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxnb2xmJTIwcHJvJTIwc2hvcCUyMGFwcGFyZWx8ZW58MHx8fHwxNzgxNjE2OTc3fDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Clubhouse Cafe Meal",
        "description": "Any signature meal and beverage from the clubhouse cafe.",
        "points_cost": 600,
        "category": "cafe",
        "image_url": "https://images.unsplash.com/photo-1585418694458-dc80a5c20294?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBnb2xmJTIwY2x1Ymhvb3VzZSUyMHJlc3RhdXJhbnR8ZW58MHx8fHwxNzgxNjE2OTkxfDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Specialty Coffee & Pastry",
        "description": "Free specialty coffee with any pastry from the cafe.",
        "points_cost": 150,
        "category": "cafe",
        "image_url": "https://images.unsplash.com/photo-1585418694458-dc80a5c20294?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBnb2xmJTIwY2x1Ymhvb3VzZSUyMHJlc3RhdXJhbnR8ZW58MHx8fHwxNzgxNjE2OTkxfDA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "30-min Lesson with Pro",
        "description": "Half-hour private lesson with a PGA-certified instructor.",
        "points_cost": 1800,
        "category": "lessons",
        "image_url": "https://images.unsplash.com/photo-1709525616662-8d9f9a995ceb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxnb2xmJTIwY291cnNlJTIwZ29sZGVuJTIwaG91cnxlbnwwfHx8fDE3ODE2MTY5Nzd8MA&ixlib=rb-4.1.0&q=85",
    },
    {
        "title": "Full 1-Hour Lesson",
        "description": "Comprehensive 60-minute swing analysis & coaching.",
        "points_cost": 3200,
        "category": "lessons",
        "image_url": "https://images.unsplash.com/photo-1709525616662-8d9f9a995ceb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxnb2xmJTIwY291cnNlJTIwZ29sZGVuJTIwaG91cnxlbnwwfHx8fDE3ODE2MTY5Nzd8MA&ixlib=rb-4.1.0&q=85",
    },
]


async def seed_rewards():
    count = await db.rewards.count_documents({})
    if count >= len(DEFAULT_REWARDS):
        return
    # Insert any missing by title
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
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
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
