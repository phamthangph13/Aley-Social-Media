from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from groq import Groq
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="LLAMA API",
    description="API for interacting with LLAMA model",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

API_KEY = "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"
client = Groq(api_key=API_KEY)

class ChatRequest(BaseModel):
    message: str
    temperature: Optional[float] = 1.0
    max_tokens: Optional[int] = 1024
    top_p: Optional[float] = 1.0
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "user", "content": request.message}
            ],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p,
            stream=request.stream
        )

        if request.stream:
            response_text = ""
            for chunk in completion:
                response_text += chunk.choices[0].delta.content or ""
            return ChatResponse(response=response_text)
        else:
            return ChatResponse(response=completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 