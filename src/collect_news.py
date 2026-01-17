import feedparser
import json
import os
import hashlib
from datetime import datetime
from time import mktime
from bs4 import BeautifulSoup

# Configuration
FEEDS = [
    {"url": "http://googleaiblog.blogspot.com/atom.xml", "source": "Google AI Blog", "category": "AI"},
    {"url": "https://www.theverge.com/ai/rss/index.xml", "source": "The Verge", "category": "AI"},
    {"url": "https://zenn.dev/feed", "source": "Zenn", "category": "Programming"},
    {"url": "https://qiita.com/popular-items/feed", "source": "Qiita", "category": "Programming"},
    {"url": "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml", "source": "ITmedia", "category": "IT"},
]

KEYWORDS = ["AI", "LLM", "生成AI", "Java", "Python", "転職", "採用", "Machine Learning", "Deep Learning", "GPT", "Gemini"]

EXISTING_NEWS_FILE = "data/news.json"

def load_existing_news():
    if os.path.exists(EXISTING_NEWS_FILE):
        try:
            with open(EXISTING_NEWS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return []
    return []

def save_news(news_list):
    # Ensure directory exists
    os.makedirs(os.path.dirname(EXISTING_NEWS_FILE), exist_ok=True)
    with open(EXISTING_NEWS_FILE, "w", encoding="utf-8") as f:
        json.dump(news_list, f, ensure_ascii=False, indent=2)

def generate_id(link):
    return hashlib.md5(link.encode('utf-8')).hexdigest()

def clean_summary(summary):
    if not summary:
        return ""
    soup = BeautifulSoup(summary, "html.parser")
    text = soup.get_text(separator=" ", strip=True)
    return text[:200] + "..." if len(text) > 200 else text

def is_relevant(entry):
    title = entry.get("title", "")
    summary = entry.get("summary", entry.get("description", ""))
    text = (title + " " + summary).lower()
    
    for k in KEYWORDS:
        if k.lower() in text:
            return True
    return False

def format_date(entry):
    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        return datetime.fromtimestamp(mktime(entry.published_parsed)).isoformat()
    elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
         return datetime.fromtimestamp(mktime(entry.updated_parsed)).isoformat()
    else:
        return datetime.now().isoformat()

def main():
    try:
        existing_news = load_existing_news()
        existing_ids = {item['id'] for item in existing_news}
        
        new_items = []
        
        for feed in FEEDS:
            print(f"{feed['source']} を取得中...")
            try:
                parsed = feedparser.parse(feed['url'])
                if parsed.bozo:
                    print(f"  警告: {feed['url']} の解析に問題があります: {parsed.bozo_exception}")

                for entry in parsed.entries:
                    if not is_relevant(entry):
                        continue
                        
                    link = entry.link
                    entry_id = generate_id(link)
                    
                    if entry_id in existing_ids:
                        continue
                        
                    summary = clean_summary(entry.get("summary", entry.get("description", "")))
                    
                    item = {
                        "id": entry_id,
                        "title": entry.title,
                        "summary": summary, # Placeholder/Excerpt
                        "link": link,
                        "source": feed["source"],
                        "category": feed["category"],
                        "updated": format_date(entry),
                        "ai_summary_done": False 
                    }
                    new_items.append(item)
                    existing_ids.add(entry_id)
            except Exception as e:
                print(f"  エラー: {feed['source']} の取得に失敗しました: {e}")
        
        print(f"{len(new_items)} 件の新しい記事が見つかりました。")
        
        if new_items:
            # Prepend new items
            all_news = new_items + existing_news
            # Keep only 100
            all_news = all_news[:100]
            save_news(all_news)
        else:
            print("新しい記事は見つかりませんでした。")

    except Exception as e:
        print(f"Fatal error: {e}")

if __name__ == "__main__":
    main()
