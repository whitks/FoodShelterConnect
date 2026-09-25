import random
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

MAKE_WEBHOOK_URL = "https://hook.us2.make.com/cjbm2p34jah3mtsjp0senfosvpmfne15"


class PostData(BaseModel):
  text: str


@app.post("/post-to-twitter")
async def post_to_twitter(data: PostData):
  # Automatically append a random hackathon code to guarantee it's never a duplicate
  unique_text = f"{data.text} [ID: {random.randint(1000, 9999)}]"

  async with httpx.AsyncClient() as client:
    response = await client.post(MAKE_WEBHOOK_URL, json={"text": unique_text})

    if response.status_code != 200:
      raise HTTPException(
          status_code=500, detail="Failed to send post to Make.com"
      )

  return {
      "status": "success",
      "message": f"Successfully sent: '{unique_text}'",
  }