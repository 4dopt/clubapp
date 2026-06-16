"""PlayGolf backend regression tests.

Covers:
- request-otp / verify-otp (mocked phone OTP)
- /api/me (auth, no _id)
- rewards list + category filter + detail
- points/add (tier promotion)
- redeem (success + insufficient funds)
- transactions list (sorted desc)
- auth guards
"""
import os
import secrets

import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('EXPO_BACKEND_URL', '')).rstrip('/')
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _new_phone() -> str:
    # Unique phone per session run to avoid reusing accounts
    return "+1555" + ''.join(secrets.choice("0123456789") for _ in range(7))


@pytest.fixture(scope="session")
def new_user(session):
    phone = _new_phone()
    r = session.post(f"{API}/auth/request-otp", json={"phone": phone})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("dev_otp") == "0000"
    assert body.get("ok") is True

    r = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "0000", "name": "TEST_User"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    user = data["user"]
    assert user["points_balance"] == 250
    assert user["lifetime_points"] == 250
    assert user["tier"] == "Silver"
    assert "_id" not in user
    assert user["name"] == "TEST_User"
    return {"phone": phone, "token": data["token"], "user": user}


# ---------- Auth ----------
class TestAuth:
    def test_request_otp_returns_dev_otp(self, session):
        r = session.post(f"{API}/auth/request-otp", json={"phone": _new_phone()})
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        assert body.get("dev_otp") == "0000"

    def test_request_otp_invalid_phone(self, session):
        r = session.post(f"{API}/auth/request-otp", json={"phone": "123"})
        assert r.status_code == 400

    def test_verify_otp_wrong_code(self, session):
        phone = _new_phone()
        session.post(f"{API}/auth/request-otp", json={"phone": phone})
        r = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "9999"})
        assert r.status_code == 401

    def test_verify_otp_idempotent_same_phone(self, session, new_user):
        # Second verify with same phone returns same user (same member_id / id)
        session.post(f"{API}/auth/request-otp", json={"phone": new_user["phone"]})
        r = session.post(f"{API}/auth/verify-otp", json={"phone": new_user["phone"], "otp": "0000"})
        assert r.status_code == 200
        u2 = r.json()["user"]
        assert u2["id"] == new_user["user"]["id"]
        assert u2["member_id"] == new_user["user"]["member_id"]


# ---------- /api/me ----------
class TestMe:
    def test_me_returns_user_no_underscore_id(self, session, new_user):
        r = session.get(f"{API}/me", headers={"Authorization": f"Bearer {new_user['token']}"})
        assert r.status_code == 200
        user = r.json()
        assert "_id" not in user
        assert user["id"] == new_user["user"]["id"]
        assert user["phone"] == new_user["phone"]

    def test_me_requires_auth(self, session):
        r = session.get(f"{API}/me")
        assert r.status_code == 401


# ---------- Rewards ----------
class TestRewards:
    def test_rewards_seeded_ten(self, session):
        r = session.get(f"{API}/rewards")
        assert r.status_code == 200
        rewards = r.json()
        assert isinstance(rewards, list)
        assert len(rewards) >= 10
        cats = {x["category"] for x in rewards}
        assert {"range", "course", "proshop", "cafe", "lessons"}.issubset(cats)
        for x in rewards:
            assert "_id" not in x
            assert "id" in x and "title" in x and "points_cost" in x

    def test_rewards_category_filter_range(self, session):
        r = session.get(f"{API}/rewards", params={"category": "range"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert all(x["category"] == "range" for x in items)

    def test_reward_detail(self, session):
        items = session.get(f"{API}/rewards").json()
        rid = items[0]["id"]
        r = session.get(f"{API}/rewards/{rid}")
        assert r.status_code == 200
        assert r.json()["id"] == rid

    def test_reward_detail_404(self, session):
        r = session.get(f"{API}/rewards/does-not-exist")
        assert r.status_code == 404

    def test_rewards_public_no_auth(self, session):
        r = session.get(f"{API}/rewards")
        assert r.status_code == 200


# ---------- Points / Tier promotion ----------
class TestPoints:
    def test_add_points_promotes_silver_to_gold(self, session):
        # Use a fresh user so the promotion lifecycle is deterministic
        phone = _new_phone()
        session.post(f"{API}/auth/request-otp", json={"phone": phone})
        v = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "0000", "name": "TEST_Promo"}).json()
        token = v["token"]
        # Starter: 250 lifetime; +850 → 1100 → Gold
        r = session.post(
            f"{API}/points/add",
            json={"points": 850, "title": "TEST_visit"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["tier"] == "Gold"
        assert body["lifetime_points"] == 1100
        assert body["new_balance"] == 1100

        # /me should reflect Gold
        me = session.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"}).json()
        assert me["tier"] == "Gold"
        assert me["lifetime_points"] == 1100

    def test_add_points_requires_auth(self, session):
        r = session.post(f"{API}/points/add", json={"points": 100})
        assert r.status_code == 401

    def test_add_points_invalid(self, session, new_user):
        r = session.post(
            f"{API}/points/add",
            json={"points": 0},
            headers={"Authorization": f"Bearer {new_user['token']}"},
        )
        assert r.status_code == 400


# ---------- Redemption ----------
class TestRedeem:
    def test_redeem_insufficient_points(self, session, new_user):
        # Find an expensive reward
        rewards = session.get(f"{API}/rewards").json()
        expensive = max(rewards, key=lambda x: x["points_cost"])
        r = session.post(
            f"{API}/redeem",
            json={"reward_id": expensive["id"]},
            headers={"Authorization": f"Bearer {new_user['token']}"},
        )
        assert r.status_code == 400

    def test_redeem_success_deducts_points(self, session):
        phone = _new_phone()
        session.post(f"{API}/auth/request-otp", json={"phone": phone})
        v = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "0000", "name": "TEST_Redeem"}).json()
        token = v["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Pick a cheap reward (e.g. 150 cost specialty coffee)
        rewards = session.get(f"{API}/rewards").json()
        cheap = min(rewards, key=lambda x: x["points_cost"])
        assert 250 >= cheap["points_cost"]

        r = session.post(f"{API}/redeem", json={"reward_id": cheap["id"]}, headers=headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert isinstance(body["redemption_code"], str) and len(body["redemption_code"]) >= 6
        assert body["new_balance"] == 250 - cheap["points_cost"]

        # Verify in /me
        me = session.get(f"{API}/me", headers=headers).json()
        assert me["points_balance"] == 250 - cheap["points_cost"]

    def test_redeem_unknown_reward(self, session, new_user):
        r = session.post(
            f"{API}/redeem",
            json={"reward_id": "no-such-id"},
            headers={"Authorization": f"Bearer {new_user['token']}"},
        )
        assert r.status_code == 404

    def test_redeem_requires_auth(self, session):
        r = session.post(f"{API}/redeem", json={"reward_id": "x"})
        assert r.status_code == 401


# ---------- Transactions ----------
class TestTransactions:
    def test_transactions_after_actions_sorted_desc(self, session):
        phone = _new_phone()
        session.post(f"{API}/auth/request-otp", json={"phone": phone})
        v = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "0000", "name": "TEST_Txn"}).json()
        token = v["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Add points
        session.post(f"{API}/points/add", json={"points": 150, "title": "TEST_visit"}, headers=headers)
        # Redeem cheapest
        rewards = session.get(f"{API}/rewards").json()
        cheap = min(rewards, key=lambda x: x["points_cost"])
        session.post(f"{API}/redeem", json={"reward_id": cheap["id"]}, headers=headers)

        r = session.get(f"{API}/transactions", headers=headers)
        assert r.status_code == 200
        txns = r.json()
        # Expect at least: welcome, visit, redeem
        assert len(txns) >= 3
        # Sort: desc by created_at
        created = [t["created_at"] for t in txns]
        assert created == sorted(created, reverse=True)
        types = {t["type"] for t in txns}
        assert {"earn", "redeem"}.issubset(types)
        # Welcome bonus present
        assert any(t.get("title") == "Welcome bonus" for t in txns)

    def test_transactions_requires_auth(self, session):
        r = session.get(f"{API}/transactions")
        assert r.status_code == 401


# ---------- Root ----------
class TestRoot:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True
