import subprocess
import signal
import sys
import time

# List of consumer scripts to run
CONSUMERS = [
    "csv_log_consumer.py",
    "db_log_consumer.py",
    "analytics_consumer.py"
]

processes = []

def start_consumers():
    """Start all consumer processes"""
    for consumer in CONSUMERS:
        print(f"Starting consumer: {consumer}")
        # Start process and redirect output to a log file
        log_file = open(f"{consumer.replace('.py', '')}.log", "w")
        process = subprocess.Popen(["python", consumer], 
                                  stdout=log_file, 
                                  stderr=subprocess.STDOUT)
        processes.append((process, log_file))
    
    print(f"Started {len(processes)} consumers")

def stop_consumers():
    """Stop all consumer processes"""
    for process, log_file in processes:
        print(f"Stopping process with PID: {process.pid}")
        process.terminate()
        process.wait(timeout=5)
        log_file.close()
    
    print("All consumers stopped")

def signal_handler(sig, frame):
    """Handle Ctrl+C to gracefully stop all processes"""
    print("Shutting down...")
    stop_consumers()
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start all consumers
    start_consumers()
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        stop_consumers()