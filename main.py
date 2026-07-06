import os
import openai
from openai import OpenAI
import PyPDF2

client = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"]
)

# Define the bot profile instructions
BOT_PROFILE = """
You are a tool for matching sentences and excerpts in a script to videos
All videos are described with a description and are taken from the Netflix show ARCANE
Your goal is to match these videos to the script for a youtube video

In the attached file names document, ignore \"Individuals\", \"Groups\", and \"Settings\" 
All other heirarchies are file locations within C:\\Users\\roblox\\Documents\\YT\\Arcane\\Arcane Footage
For example, Characters -> Individuals -> Ambessa -> Season 1 -> 8.7.1 Ambessa Introduction is the file location "C:\\Users\\roblox\\Documents\\YT\\Arcane\\Arcane Footage\\Ambessa\\Season 1\\8.7.1 Ambessa introduction.mp4"
Always reply to clips in file format unless asked a question starting with !
"""

# Function to extract bullet points from a PDF
def extract_bullet_points_from_pdf(pdf_path):
    bullet_points = []
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text = page.extract_text()
            if text:
                bullet_points.append(text)
    return "\n".join(bullet_points)  # Combine all text into a single string

# Load bullet points from PDF
pdf_file_path = "bullet_points.pdf"  # Replace with your actual PDF file path
bullet_points_content = extract_bullet_points_from_pdf("C:\\Users\\roblox\\Documents\\YT\\Coding\\File Names (1).pdf")


def chat_with_gpt(prompt):
    response = client.chat.completions.create(
        
        messages=[{"role": "user", "content": BOT_PROFILE + "\n\nAvailable content:\n" + bullet_points_content + prompt}],
        model='gpt-3.5-turbo'
    )
    return response.choices[0].message.content.strip()

if __name__ == "__main__":
    while True:
        user_input = input("You: ")
        if user_input.lower() in ["quit", "exit", "bye", "done"]:
            break

        response = chat_with_gpt(user_input)
        print("chatbot: ", response)
