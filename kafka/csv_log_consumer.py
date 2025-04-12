from kafka import KafkaConsumer
import json
import csv
import os
from datetime import datetime

# Configuration
KAFKA_TOPIC = 'legal_chatbot_logs'
BOOTSTRAP_SERVERS = ['localhost:9092']
CSV_LOG_DIR = '../logs'
CSV_FILENAME_FORMAT = '%Y-%m-%d'  # Daily log files

# Ensure log directory exists
os.makedirs(CSV_LOG_DIR, exist_ok=True)

def get_csv_file_path():
    """Generate the CSV file path based on the current date"""
    date_str = datetime.now().strftime(CSV_FILENAME_FORMAT)
    return os.path.join(CSV_LOG_DIR, f"legal_chatbot_logs_{date_str}.csv")

def ensure_csv_headers(file_path):
    """Ensure the CSV file has headers if it's new"""
    file_exists = os.path.isfile(file_path)
    if not file_exists:
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f, quoting=csv.QUOTE_ALL)
            writer.writerow(["Timestamp", "User Input", "AI Response", "Conversation ID", "Metadata"])

def main():
    # Initialize Kafka consumer
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=BOOTSTRAP_SERVERS,
        value_deserializer=lambda x: json.loads(x.decode('utf-8')),
        group_id='csv_consumer_group',
        auto_offset_reset='earliest'
    )
    
    print(f"CSV Logger started. Listening to topic: {KAFKA_TOPIC}")
    
    for message in consumer:
        try:
            # Get log data from kafka message
            log_data = message.value
            
            # Get the current CSV file path (changes at midnight)
            csv_file_path = get_csv_file_path()
            
            # Ensure headers exist if new file
            ensure_csv_headers(csv_file_path)
            
            # Write the log entry with proper escaping for newlines
            with open(csv_file_path, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f, quoting=csv.QUOTE_ALL)
                
                # Format metadata as a string
                metadata_str = json.dumps(log_data.get('metadata', {}))
                
                # Replace newlines in input and response
                user_input = log_data['user_input'].replace('\n', '\\n').replace('\r', '')
                ai_response = log_data['ai_response'].replace('\n', '\\n').replace('\r', '')
                
                writer.writerow([
                    log_data['timestamp'],
                    user_input,
                    ai_response,
                    log_data.get('conversation_id', 'unknown'),
                    metadata_str
                ])
                
            print(f"Logged entry to CSV: {csv_file_path}")
            
        except Exception as e:
            print(f"Error processing message: {str(e)}")

if __name__ == "__main__":
    main()