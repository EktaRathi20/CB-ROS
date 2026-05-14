# Overview

CB-ROS is Research Intelligence Platform focused on accelerating catalyst discovery through scientific workflows. The current implementation demonstrates the foundational architecture, intelligent discovery pipeline, and closed-loop learning capabilities of the system.

As part of the long-term vision, several advanced modules are planned for future development phases. The present prototype is designed to validate the core concept, workflow efficiency, adaptive intelligence loop, and real-time collaborative research infrastructure.

The platform combines Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), vector embeddings, peer-reviewed experimentation, and continuous feedback learning into a unified scientific operating system.

# End-to-End System Workflow

## 1. User Authentication & Project Creation

The researcher logs into the platform through the React-based frontend interface and creates a new research project by defining:

- Reactants
- Products
- Experimental conditions
- Iteration limits

The frontend sends structured project data to the backend APIs, where the project is validated and stored in PostgreSQL.

## 2. Reaction Resolution & Validation

Once the project is created, the backend reaction engine processes the chemical equation.

The system:

- Parses the reaction structure
- Uses Gemini to infer missing compounds
- Verifies compounds through PubChem
- Generates a standardized machine-readable reaction format

The validated response is returned to the frontend dashboard for visualization and further discovery execution.

## 3. AI Discovery Pipeline

The researcher initiates the discovery process from the frontend Discovery module.

The backend then executes a multi-stage AI pipeline:

- Historical experiment retrieval using RAG
- Prompt construction with scientific context
- Catalyst generation using Gemini
- Duplicate elimination
- Vector similarity comparison using pgvector embeddings
- Diversity scoring and ranking
- Bias calibration using prior experiment data

During execution, the frontend receives real-time SSE streaming updates, allowing users to monitor:

- Pipeline stages
- AI processing logs
- Generated candidates
- Completion states

This creates a transparent and interactive AI-assisted research workflow.

## 4. Candidate Evaluation & Experiment Submission

Researchers review generated catalyst candidates through the frontend workspace and can:

- Select AI-generated candidates
- Add custom candidates
- Submit laboratory experiment results

The backend stores each experiment as a structured submission for scientific validation.

## 5. Peer Review & Feedback Intelligence

Submitted experiments enter a peer-review workflow where another researcher can:

- Approve
- Reject
- Request changes

The backend then:

- Compares predicted vs actual results
- Generates calibration logs
- Detects high-error predictions
- Creates Failure Insights for future learning

Approved experiments become part of the system’s growing scientific intelligence base.

## 6. Continuous Learning Loop

The retraining engine aggregates reviewed experimental data and creates Training Snapshots.

These snapshots are reused in future discovery cycles to:

- Improve prediction accuracy
- Apply bias correction
- Enhance RAG context retrieval
- Continuously optimize candidate generation

This allows CB-ROS to evolve dynamically through data-driven feedback instead of static retraining workflows.

# Simplified System Flow

Researcher Interface (React Frontend)  
→ Project Creation & Discovery Trigger  
→ Backend AI Processing Engine  
→ Gemini + RAG + Vector Similarity Pipeline  
→ Candidate Generation  
→ Real-Time SSE Streaming to Frontend  
→ Experiment Submission  
→ Peer Review & Validation  
→ Calibration & Failure Insights  
→ Training Snapshot Generation  
→ Improved Future Discovery Cycles

# Technology Stack

## Frontend

- React 18
- Vite
- Tailwind CSS
- React Router v6
- Server-Sent Events (SSE)

## Backend

- Node.js 20
- TypeScript
- Express.js
- Prisma ORM

## Database & Intelligence

- PostgreSQL
- pgvector (Vector Embeddings)
- Google Gemini (LLM + Embeddings)
- PubChem APIs
- Retrieval-Augmented Generation (RAG)

## Documentation

- Swagger API Documentation

# Drive Link for Documentation

https://drive.google.com/drive/folders/1-ZMzxfwOOkmjDYhqQlbgB7qTAV_bA_VC?usp=sharing
