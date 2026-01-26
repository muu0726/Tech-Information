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
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(NEWS_FILE), exist_ok=True)
        
        with open(NEWS_FILE, "w", encoding="utf-8") as f:
            json.dump(news_list, f, ensure_ascii=False, indent=2)
        print(f"Successfully saved {len(news_list)} items to {NEWS_FILE}")
    except Exception as e:
        print(f"Error saving news file: {e}")


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
            
        print(f"要約・翻訳中: {item['title']}...")
        
        try:
            content_text = item.get('summary', '') or item.get('title', '')
            
            prompt = f"""
            以下のニュース記事の情報を元に、以下のJSON形式で出力してください。
            
            1. `translated_title`: 記事タイトルを日本語に翻訳したもの。
            2. `summary`: 記事の要約を日本語で3行の箇条書きにしたもの（です・ます調）。

            記事タイトル: {item['title']}
            記事概要: {content_text}
            """
            
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            if response.text:
                result = json.loads(response.text)
                
                # Update article with translated content
                item['original_title'] = item['title'] # Backup original
                item['title'] = result.get('translated_title', item['title'])
                item['summary'] = result.get('summary', item.get('summary', ''))
                
                item['ai_summary_done'] = True
                count += 1
                time.sleep(2) # Avoid aggressive rate limiting
            
        except Exception as e:
            print(f"記事 {item['id']} の処理中にエラーが発生しました: {e}")
            
    if count > 0:
        save_news(news_items)
        print(f"{count} 件の記事を要約しました。")
    else:
        print("新しく要約された記事はありません。")

if __name__ == "__main__":
    main()
