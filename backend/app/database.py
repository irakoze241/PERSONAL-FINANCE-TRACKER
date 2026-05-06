import motor.motor_asyncio
from app.config import settings

client: motor.motor_asyncio.AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.transactions.create_index("user_id")
    await db.transactions.create_index([("user_id", 1), ("date", -1)])
    await db.transactions.create_index([("user_id", 1), ("category", 1)])
    await db.budgets.create_index([("user_id", 1), ("category", 1)], unique=True)
    print("[OK] Connected to MongoDB")


async def close_db():
    global client
    if client:
        client.close()
        print("[OK] MongoDB connection closed")


def get_db():
    return db
