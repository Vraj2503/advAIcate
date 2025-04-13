import os
import pandas as pd
import matplotlib.pyplot as plt
import json
from datetime import datetime
import time

# Configuration
LOGS_DIR = '../logs'
ANALYTICS_DIR = '../analytics'
CSV_PREFIX = 'legal_chatbot_logs_'
CSV_SUFFIX = '.csv'
REFRESH_INTERVAL = 5  # seconds

# Ensure analytics directory exists
os.makedirs(ANALYTICS_DIR, exist_ok=True)

class LiveAnalytics:
    def __init__(self):
        self.df_logs = pd.DataFrame()
        self.previous_total_rows = 0

    def load_all_logs(self):
        """Load all relevant log CSVs from the logs directory."""
        combined_df = pd.DataFrame()
        for filename in os.listdir(LOGS_DIR):
            if filename.startswith(CSV_PREFIX) and filename.endswith(CSV_SUFFIX):
                file_path = os.path.join(LOGS_DIR, filename)
                try:
                    df = pd.read_csv(file_path, parse_dates=['Timestamp'])
                    combined_df = pd.concat([combined_df, df], ignore_index=True)
                except Exception as e:
                    print(f"Failed to read {filename}: {e}")
        return combined_df

    def extract_query_type(self, metadata_str):
        """Extract query_type from JSON-like Metadata string."""
        try:
            metadata = json.loads(metadata_str.replace('""', '"').replace("'", '"'))
            return metadata.get('query_type', 'Unknown')
        except Exception:
            return 'Unknown'

    def analyze(self):
        self.df_logs = self.load_all_logs()
        current_total_rows = len(self.df_logs)

        if current_total_rows == self.previous_total_rows:
            return  # No new data

        print(f"Detected new data ({current_total_rows} rows), updating analytics...")
        self.previous_total_rows = current_total_rows

        # Add computed columns
        self.df_logs['Query Length'] = self.df_logs['User Input'].astype(str).apply(len)
        self.df_logs['Response Length'] = self.df_logs['AI Response'].astype(str).apply(len)
        self.df_logs['Query Type'] = self.df_logs['Metadata'].astype(str).apply(self.extract_query_type)

        # Generate updated plots
        self.plot_query_type_distribution()
        self.plot_length_trends()

    def plot_query_type_distribution(self):
        """Plot and save pie chart of query types."""
        plt.figure(figsize=(7, 7))
        query_counts = self.df_logs['Query Type'].value_counts()
    
        # Optional: limit to top N and group others
        top_n = 8
        if len(query_counts) > top_n:
            others_sum = query_counts[top_n:].sum()
            query_counts = query_counts[:top_n]
            query_counts['Others'] = others_sum

        plt.pie(
            query_counts,
            labels=query_counts.index,
            autopct='%1.1f%%',
            startangle=140,
            colors=plt.cm.Paired.colors
            )

        plt.title("Query Type Distribution")
        plt.axis('equal')  # Equal aspect ratio ensures pie is a circle
        path = os.path.join(ANALYTICS_DIR, 'query_type_distribution.png')
        plt.savefig(path)
        plt.close()
        print(f"Saved pie chart: {path}")


    def plot_length_trends(self):
        """Plot and save line chart of query/response lengths over time."""
        df_sorted = self.df_logs.sort_values('Timestamp')
        plt.figure(figsize=(10, 5))
        plt.plot(df_sorted['Timestamp'], df_sorted['Query Length'], label='Query Length', color='royalblue')
        plt.plot(df_sorted['Timestamp'], df_sorted['Response Length'], label='Response Length', color='orange')
        plt.title("Query & Response Length Over Time")
        plt.xlabel("Time")
        plt.ylabel("Length (Characters)")
        plt.legend()
        plt.xticks(rotation=30, ha='right')
        plt.tight_layout()
        path = os.path.join(ANALYTICS_DIR, 'length_trends.png')
        plt.savefig(path)
        plt.close()
        print(f"Saved: {path}")

def main():
    print("Live Analytics Consumer Started.")
    analytics = LiveAnalytics()
    while True:
        try:
            analytics.analyze()
            time.sleep(REFRESH_INTERVAL)
        except KeyboardInterrupt:
            print("Shutting down analytics consumer...")
            break
        except Exception as e:
            print(f"Error in analytics: {e}")

if __name__ == "__main__":
    main()
