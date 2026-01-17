import json
import os
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

NEWS_FILE = "data/news.json"
API_KEY = os.getenv("GEMINI_API_KEY")

def load_news():
    if not os.path.exists(NEWS_FILE):
        return []
    with open(NEWS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_news(news_list):
    with open(NEWS_FILE, "w", encoding="utf-8") as f:
        json.dump(news_list, f, ensure_ascii=False, indent=2)

def main():
    if not API_KEY:
        print("GEMINI_API_KEY が見つかりません。AI要約をスキップします。")
        return

    print("AI要約を開始します...")
    genai.configure(api_key=API_KEY)
    
    # Use a lightweight model
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    news_items = load_news()
    count = 0
    max_process = 20 # Processing limit per run to avoid timeout/quota issues in Actions
    
    for item in news_items:
        if count >= max_process:
            break
            
        if item.get("ai_summary_done"):
            continue
            
        print(f"要約中: {item['title']}...")
        
        try:
            content_text = item.get('summary', '') or item.get('title', '')
            
            prompt = f"""
            以下のニュース記事の情報を元に、日本語で3行の箇条書き要約を作成してください。
            です・ます調で、簡潔にまとめてください。

            記事タイトル: {item['title']}
            記事概要: {content_text}
            """
            
            response = model.generate_content(prompt)
            
            if response.text:
                item['summary'] = response.text.strip()
                item['ai_summary_done'] = True
                count += 1
                time.sleep(2) # Avoid aggressive rate limiting
            
        except Exception as e:
            print(f"記事 {item['id']} の要約中にエラーが発生しました: {e}")
            
    if count > 0:
        save_news(news_items)
        print(f"{count} 件の記事を要約しました。")
    else:
        print("新しく要約された記事はありません。")

if __name__ == "__main__":
    main()
