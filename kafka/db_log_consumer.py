from kafka import KafkaConsumer
import json
import pymongo
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# Configuration
KAFKA_TOPIC = 'legal_chatbot_logs'
BOOTSTRAP_SERVERS = ['localhost:9092']
MONGO_URI = f"mongodb+srv://kathanpatel1803:{os.getenv('MONGO_DB_PASSWORD')}@legal-chatbot.dk2dedk.mongodb.net/?retryWrites=true&w=majority&appName=Legal-Chatbot"
DB_NAME = 'legal_chatbot'
COLLECTION_NAME = 'chat_logs'

def main():
    # Initialize MongoDB connection
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Create indexes for better query performance
    collection.create_index([('timestamp', pymongo.DESCENDING)])
    collection.create_index([('conversation_id', pymongo.ASCENDING)])
    
    # Initialize Kafka consumer
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=BOOTSTRAP_SERVERS,
        value_deserializer=lambda x: json.loads(x.decode('utf-8')),
        group_id='db_consumer_group',
        auto_offset_reset='earliest'
    )
    
    print(f"Database Logger started. Listening to topic: {KAFKA_TOPIC}")
    
    for message in consumer:
        try:
            # Get log data from kafka message
            log_data = message.value
            
            # Add additional fields for database
            log_data['created_at'] = datetime.now()
            log_data['processed'] = True
            
            # Insert into MongoDB
            result = collection.insert_one(log_data)
            
            print(f"Logged entry to MongoDB with ID: {result.inserted_id}")
            
        except Exception as e:
            print(f"Error processing message: {str(e)}")

if __name__ == "__main__":
    main()