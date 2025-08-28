import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    const cleanEmail = email?.toLowerCase()?.trim();
    if (!cleanEmail || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection("users").findOne({ email: cleanEmail });
    if (existing) {
      return new Response(JSON.stringify({ error: "Email already in use" }), { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const { insertedId } = await db.collection("users").insertOne({
      name: name || "",
      email: cleanEmail,
      password: hash,
      createdAt: new Date(),
    });

    return new Response(JSON.stringify({ ok: true, id: insertedId }), { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Server error" }), { status: 500 });
  }
}
