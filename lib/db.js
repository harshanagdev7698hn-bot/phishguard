// lib/db.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!uri) throw new Error("Missing MONGODB_URI in env");

if (process.env.NODE_ENV === "development") {
  if (!global._mongo) {
    client = new MongoClient(uri);
    global._mongo = client.connect();
  }
  clientPromise = global._mongo;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  const conn = await clientPromise;
  return conn.db("phishguard"); // database name
}
