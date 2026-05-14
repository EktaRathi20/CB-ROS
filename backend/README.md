# 🧪 Catalyst Discovery & Feedback System

Welcome to the **CB-ROS Backend**! This is a production-grade system designed to help scientists discover new catalysts and learn from every experiment using a closed-loop AI feedback system.

---

## 🌟 What does this system do?

Think of this as a "Learning Brain" for chemical research. It doesn't just guess catalysts; it remembers past results and specifically avoids making the same mistakes twice.

1.  **Smart Discovery**: You submit a reaction, and the AI suggests a catalyst.
2.  **RAG (Memory)**: The AI looks at similar past experiments and "failure insights" to refine its suggestion.
3.  **The Loop**: When you finish a real-world experiment, you tell the system the results. If the AI was wrong, it creates a "Failure Insight" so it can do better next time.

---

## 🛠️ Getting Started (The Easy Way)

### 1. Requirements
*   **Node.js** (v20+)
*   **Docker** (Optional, but recommended for the database)
*   **OpenAI API Key** (For the LLM "brain")

### 2. Set up the Environment
Copy the example environment file and add your keys:
```bash
cp .env.example .env
```
*Edit `.env` and add your `OPENAI_API_KEY`.*

### 3. Start the Infrastructure
If you have Docker, run this to start the database and cache instantly:
```bash
docker-compose up -d
```
*(Note: If you don't have Redis, don't worry! The app is smart enough to run without it.)*

### 4. Install & Prepare
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run the App
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

---

## 📖 How to use it

### 1. Explore the API Documentation
We've built a full interactive dashboard for the API. Open your browser and go to:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### 2. The Core Workflow
1.  **Initiate Discovery**: `POST /api/discovery`
    *   Tell the AI what reaction you're working on. It will return a candidate catalyst formula.
2.  **Submit Results**: `POST /api/experiments`
    *   Once you've tested the catalyst in the lab, send the "actual score" back to the system.
3.  **Approve & Learn**: `PATCH /api/experiments/{id}/approve`
    *   This is the most important step! Approving a result triggers the **Feedback Loop**. The system calculates how far off its prediction was and saves "Failure Insights" if it made a big mistake.

---

## 🧠 The "Magic" (The Feedback Loop)
The next time you ask for a discovery, the system will automatically:
1.  Search for similar past catalysts using **Vector Similarity**.
2.  Read all **Failure Insights** from that project.
3.  Tell the LLM: *"Last time you suggested X, it failed because of Y. Don't do that again!"*

---

## 📂 Project Structure
*   `src/services/llm.ts`: The "Brain" (Prompt generation & API calls).
*   `src/services/discovery.ts`: Orchestrates the discovery flow.
*   `src/services/experiment.ts`: Handles lab results and the feedback loop.
*   `src/services/vector.ts`: Handles the long-term memory (embeddings).
*   `src/services/pubchem.ts`: Automatically fetches chemical data from PubChem.