"""
PlayGolf Admin API regression tests.
Run against the public preview URL.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://playgolf-members.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PIN = "123456"


# ---------- Shared fixtures ----------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"pin": ADMIN_PIN})
    assert r.status_code == 200, r.text
    token = r.json()["admin_token"]
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"X-Admin-Token": admin_token, "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def test_member(session):
    """Create a fresh TEST_ member via OTP flow and return its data + token."""
    phone = f"+1555{uuid.uuid4().int % 10_000_000:07d}"
    r1 = session.post(f"{API}/auth/request-otp", json={"phone": phone})
    assert r1.status_code == 200
    r2 = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "0000", "name": "TEST_AdminTarget"})
    assert r2.status_code == 200
    data = r2.json()
    return {"phone": phone, "token": data["token"], "user": data["user"]}


# ---------- Admin login ----------
class TestAdminLogin:
    def test_admin_login_wrong_pin(self, session):
        r = session.post(f"{API}/admin/login", json={"pin": "wrong"})
        assert r.status_code == 401

    def test_admin_login_correct_pin(self, session):
        r = session.post(f"{API}/admin/login", json={"pin": ADMIN_PIN})
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        assert isinstance(body.get("admin_token"), str) and len(body["admin_token"]) > 10

    def test_admin_endpoint_rejects_without_token(self, session):
        r = session.get(f"{API}/admin/stats")
        assert r.status_code == 401

    def test_admin_endpoint_rejects_bad_token(self, session):
        r = session.get(f"{API}/admin/stats", headers={"X-Admin-Token": "nope"})
        assert r.status_code == 401

    def test_admin_me_with_token(self, session, admin_headers):
        r = session.get(f"{API}/admin/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json().get("role") == "staff"


# ---------- Admin stats ----------
class TestAdminStats:
    def test_stats_shape(self, session, admin_headers):
        r = session.get(f"{API}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        # Required keys
        for k in ["total_members", "points_issued_today", "visits_today", "redemptions_today",
                  "week_earn_total", "week_redeem_total", "tiers", "recent"]:
            assert k in body, f"missing {k}"
        assert set(body["tiers"].keys()) == {"Silver", "Gold", "Platinum"}
        assert isinstance(body["recent"], list)
        # No _id leakage
        for t in body["recent"]:
            assert "_id" not in t


# ---------- Admin members (list, get, search, patch) ----------
class TestAdminMembers:
    def test_list_members_no_id_leak(self, session, admin_headers, test_member):
        r = session.get(f"{API}/admin/members", headers=admin_headers)
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        assert len(users) >= 1
        for u in users:
            assert "_id" not in u
            assert "member_id" in u and u["member_id"].startswith("PG-")

    def test_search_by_member_id_prefix(self, session, admin_headers, test_member):
        r = session.get(f"{API}/admin/members", headers=admin_headers, params={"q": "PG-"})
        assert r.status_code == 200
        users = r.json()
        assert len(users) >= 1
        assert all(u["member_id"].startswith("PG-") for u in users)

    def test_get_member_with_transactions(self, session, admin_headers, test_member):
        uid = test_member["user"]["id"]
        r = session.get(f"{API}/admin/members/{uid}", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["id"] == uid
        assert isinstance(body["transactions"], list)

    def test_patch_member_points_balance(self, session, admin_headers, test_member):
        uid = test_member["user"]["id"]
        r = session.patch(f"{API}/admin/members/{uid}", headers=admin_headers, json={"points_balance": 999})
        assert r.status_code == 200, r.text
        # verify
        r2 = session.get(f"{API}/admin/members/{uid}", headers=admin_headers)
        assert r2.json()["user"]["points_balance"] == 999

    def test_patch_member_tier_override(self, session, admin_headers, test_member):
        uid = test_member["user"]["id"]
        r = session.patch(f"{API}/admin/members/{uid}", headers=admin_headers, json={"tier": "Gold"})
        assert r.status_code == 200
        # /me will recompute tier from lifetime, but admin GET should still reflect setpoint immediately
        r2 = session.get(f"{API}/admin/members/{uid}", headers=admin_headers)
        assert r2.json()["user"]["tier"] == "Gold"

    def test_patch_suspended_blocks_member_login(self, session, admin_headers, test_member):
        uid = test_member["user"]["id"]
        phone = test_member["phone"]
        # suspend
        r = session.patch(f"{API}/admin/members/{uid}", headers=admin_headers, json={"suspended": True})
        assert r.status_code == 200
        assert r.json()["suspended"] is True
        # verify suspended user cannot login
        session.post(f"{API}/auth/request-otp", json={"phone": phone})
        r2 = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "0000"})
        assert r2.status_code == 403
        # reactivate for cleanup
        session.patch(f"{API}/admin/members/{uid}", headers=admin_headers, json={"suspended": False})


# ---------- Admin credit-points ----------
class TestAdminCreditPoints:
    def test_credit_points_success(self, session, admin_headers, test_member):
        mid = test_member["user"]["member_id"]
        # Make sure user is not suspended
        uid = test_member["user"]["id"]
        session.patch(f"{API}/admin/members/{uid}", headers=admin_headers, json={"suspended": False})
        r = session.get(f"{API}/admin/members/{uid}", headers=admin_headers)
        balance_before = r.json()["user"]["points_balance"]
        lifetime_before = r.json()["user"]["lifetime_points"]
        r2 = session.post(f"{API}/admin/credit-points", headers=admin_headers,
                          json={"member_id": mid, "points": 300})
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["user"]["points_balance"] == balance_before + 300
        assert body["user"]["lifetime_points"] == lifetime_before + 300
        # Transaction should be by_admin
        assert body["transaction"]["by_admin"] is True
        assert body["transaction"]["type"] == "earn"

    def test_credit_points_tier_promotion(self, session, admin_headers):
        # create a fresh member, push lifetime over 1000 -> should become Gold
        phone = f"+1555{uuid.uuid4().int % 10_000_000:07d}"
        session.post(f"{API}/auth/request-otp", json={"phone": phone})
        r0 = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "0000", "name": "TEST_TierPromo"})
        u = r0.json()["user"]
        mid = u["member_id"]
        # starter lifetime is 250, add 800 -> 1050 lifetime -> Gold
        r = session.post(f"{API}/admin/credit-points", headers=admin_headers,
                         json={"member_id": mid, "points": 800})
        assert r.status_code == 200
        assert r.json()["user"]["tier"] == "Gold"

    def test_credit_points_unknown_member(self, session, admin_headers):
        r = session.post(f"{API}/admin/credit-points", headers=admin_headers,
                         json={"member_id": "PG-000000", "points": 100})
        assert r.status_code == 404

    def test_credit_points_invalid_amount(self, session, admin_headers, test_member):
        mid = test_member["user"]["member_id"]
        r = session.post(f"{API}/admin/credit-points", headers=admin_headers,
                         json={"member_id": mid, "points": 0})
        assert r.status_code == 400
        r2 = session.post(f"{API}/admin/credit-points", headers=admin_headers,
                          json={"member_id": mid, "points": -50})
        assert r2.status_code == 400


# ---------- Admin verify-redemption ----------
class TestAdminVerifyRedemption:
    def test_verify_redemption_flow(self, session, admin_headers, test_member):
        # 1) Ensure member has enough points; 2) redeem a reward; 3) verify code; 4) verify again -> already_used
        # bump balance via admin patch
        uid = test_member["user"]["id"]
        session.patch(f"{API}/admin/members/{uid}", headers=admin_headers, json={"points_balance": 5000})

        # find a low-cost reward
        r = session.get(f"{API}/rewards")
        rewards = r.json()
        assert len(rewards) > 0
        cheap = sorted(rewards, key=lambda x: x["points_cost"])[0]

        # redeem as member
        bearer = {"Authorization": f"Bearer {test_member['token']}", "Content-Type": "application/json"}
        rr = session.post(f"{API}/redeem", headers=bearer, json={"reward_id": cheap["id"]})
        assert rr.status_code == 200, rr.text
        code = rr.json()["redemption_code"]
        assert code

        # verify-redemption — first call
        v1 = session.post(f"{API}/admin/verify-redemption", headers=admin_headers, json={"code": code})
        assert v1.status_code == 200
        b1 = v1.json()
        assert b1.get("ok") is True
        assert b1.get("already_used") is False
        assert b1["transaction"]["used"] is True

        # second call — already used
        v2 = session.post(f"{API}/admin/verify-redemption", headers=admin_headers, json={"code": code})
        assert v2.status_code == 200
        b2 = v2.json()
        assert b2.get("already_used") is True

    def test_verify_unknown_code(self, session, admin_headers):
        r = session.post(f"{API}/admin/verify-redemption", headers=admin_headers, json={"code": "ZZZZZZZZ"})
        assert r.status_code == 404


# ---------- Admin rewards CRUD ----------
class TestAdminRewards:
    @pytest.fixture(scope="class")
    def created_reward(self, session, admin_headers):
        payload = {
            "title": f"TEST_AdminReward_{uuid.uuid4().hex[:6]}",
            "description": "Test reward created by admin pytest",
            "points_cost": 123,
            "category": "range",
            "image_url": "https://example.com/r.jpg",
            "active": True,
        }
        r = session.post(f"{API}/admin/rewards", headers=admin_headers, json=payload)
        assert r.status_code == 200, r.text
        return r.json()

    def test_admin_list_includes_inactive(self, session, admin_headers, created_reward):
        # First, soft-delete a fresh test reward then ensure it shows in admin list but not public list
        rid = created_reward["id"]
        d = session.delete(f"{API}/admin/rewards/{rid}", headers=admin_headers)
        assert d.status_code == 200

        admin_list = session.get(f"{API}/admin/rewards", headers=admin_headers).json()
        public_list = session.get(f"{API}/rewards").json()
        admin_ids = {r["id"] for r in admin_list}
        public_ids = {r["id"] for r in public_list}
        assert rid in admin_ids
        assert rid not in public_ids

    def test_patch_reward(self, session, admin_headers):
        # create then patch
        payload = {
            "title": f"TEST_Patch_{uuid.uuid4().hex[:6]}", "description": "x",
            "points_cost": 100, "category": "cafe", "image_url": "https://x/y.jpg",
        }
        r = session.post(f"{API}/admin/rewards", headers=admin_headers, json=payload)
        rid = r.json()["id"]
        rp = session.patch(f"{API}/admin/rewards/{rid}", headers=admin_headers,
                           json={"title": "TEST_Patched", "points_cost": 555})
        assert rp.status_code == 200
        body = rp.json()
        assert body["title"] == "TEST_Patched"
        assert body["points_cost"] == 555
        # cleanup
        session.delete(f"{API}/admin/rewards/{rid}", headers=admin_headers)

    def test_patch_unknown_reward(self, session, admin_headers):
        r = session.patch(f"{API}/admin/rewards/does-not-exist", headers=admin_headers, json={"title": "x"})
        assert r.status_code == 404
