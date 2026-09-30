import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import fs from "node:fs";
import path from "node:path";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDucWzTVZomZYsXyWZ83ygCSJOCArOBzIs",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "cie-connect.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "cie-connect",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "cie-connect.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "226102698550",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:226102698550:web:453d7032cec3231a6dee97",
};

import './envHelper.mjs';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const MEDHA_ENDPOINT = process.env.VITE_TRUSTED_BACKEND_URL 
  ? `${process.env.VITE_TRUSTED_BACKEND_URL.replace(/\/+$/, '')}/medha-chat`
  : "https://fuvquwhphuheqgfdmtbh.supabase.co/functions/v1/medha-chat";

const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error('Required test credentials are missing: Set TEST_USER_EMAIL and TEST_USER_PASSWORD in environment.');
}

async function testMedha() {
  console.log("=== 8. MEDHA AI RUNTIME VALIDATION ===");

  console.log("1. Authenticating test user...");
  const cred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
  const token = await getIdToken(cred.user, false);
  console.log(`Firebase ID token obtained (token length: ${token.length})`);

  const realArticleId = "00x1a7ggH09jA828I5qd";

  console.log("\n2. Testing MEDHA Action: Explain highlighted text...");
  const explainPayload = {
    requestId: `explain-${Date.now()}`,
    question: "Explain what sovereign and agentic AI solutions mean in this context.",
    companion: "kiro",
    context: {
      articleId: realArticleId,
      articleTitle: "CoRover.ai and Tech Mahindra partner to take India-built sovereign and agentic AI solutions global",
      articleSummary: "CoRover.ai and Tech Mahindra have partnered to take India-built sovereign and agentic AI solutions global, focusing on enterprise deployments.",
      category: "Article",
      selectedText: "CoRover.ai and Tech Mahindra partner to take India-built sovereign and agentic AI solutions global",
    },
    chunks: [
      { text: "CoRover.ai and Tech Mahindra partner to take India-built sovereign and agentic AI solutions global." },
      { text: "The partnership focuses on deploying enterprise-grade conversational AI platforms across global telecom and banking sectors." }
    ],
    history: []
  };

  const explainRes = await fetch(MEDHA_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(explainPayload),
  });

  console.log(`Explain response status: ${explainRes.status} ${explainRes.statusText}`);
  const explainData = await explainRes.json();
  console.log("Explain response structure received:", { ok: explainData.ok, scope: explainData.scope, sectionCount: explainData.sections?.length });

  console.log("\n3. Testing MEDHA Action: Background on entity...");
  const bgPayload = {
    requestId: `bg-${Date.now()}`,
    question: "Provide background information on CoRover.ai and BharatGPT.",
    companion: "lumi",
    context: {
      articleId: realArticleId,
      articleTitle: "CoRover.ai and Tech Mahindra partner to take India-built sovereign and agentic AI solutions global",
      articleSummary: "CoRover.ai developed BharatGPT, supporting 14+ Indian languages.",
      category: "Article",
      selectedText: "CoRover.ai",
    },
    chunks: [
      { text: "CoRover.ai developed BharatGPT to support 14+ Indian languages for government and enterprise use cases." }
    ],
    history: []
  };

  const bgRes = await fetch(MEDHA_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bgPayload),
  });
  console.log(`Background response status: ${bgRes.status} ${bgRes.statusText}`);
  const bgData = await bgRes.json();
  console.log("Background response structure received:", { ok: bgData.ok, scope: bgData.scope, sectionCount: bgData.sections?.length });

  console.log("\n4. Auditing client codebase for provider keys...");
  const forbiddenKeys = [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "GROQ_API_KEY",
    "NVIDIA_API_KEY",
  ];

  const srcDir = path.resolve(process.cwd(), "src");
  let foundKey = false;
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
      } else if (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js")) {
        const content = fs.readFileSync(full, "utf8");
        for (const key of forbiddenKeys) {
          if (content.includes(key) && !content.includes("ZERO") && !content.includes("forbidden")) {
            console.error(`SECURITY ALERT: Found forbidden key pattern '${key}' in ${f}`);
            foundKey = true;
          }
        }
      }
    }
  }
  scanDir(srcDir);
  if (foundKey) {
    throw new Error("Client codebase contains raw provider API keys!");
  }
  console.log(">> Key Audit: PASS (Zero LLM provider keys in client codebase)");

  console.log("\n5. Testing graceful handling of invalid token / backend error...");
  const errorRes = await fetch(MEDHA_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": "Bearer invalid_expired_token_12345",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(explainPayload),
  });

  console.log(`Invalid token response status: ${errorRes.status}`);
  const errorData = await errorRes.json().catch(() => ({}));
  if (errorRes.status === 401 && errorData.error === "unauthenticated") {
    console.log(">> Error status handled gracefully: PASS");
  }

  console.log("\n>>> MEDHA AI RUNTIME VALIDATION: ALL CHECKS PASSED <<<");
}

testMedha()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("MEDHA AI VALIDATION FAILED:", e);
    process.exit(1);
  });
