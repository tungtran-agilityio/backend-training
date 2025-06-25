#!/usr/bin/env python3
"""
Twitter Snowflake ID Generation Demo

This script demonstrates various aspects of the snowflake ID generation system:
1. Basic ID generation
2. ID parsing and analysis
3. Multi-datacenter/machine simulation
4. Performance testing
5. Uniqueness validation
"""

import time
import threading
from collections import defaultdict, Counter
from concurrent.futures import ThreadPoolExecutor
from snowflake import SnowflakeGenerator, create_generator_pool


def demo_basic_usage():
    """Demonstrate basic snowflake ID generation and parsing"""
    print("=" * 60)
    print("BASIC SNOWFLAKE ID GENERATION DEMO")
    print("=" * 60)
    
    # Create a generator for datacenter 1, machine 5
    generator = SnowflakeGenerator(datacenter_id=1, machine_id=5)
    
    print("\n📊 Generator Configuration:")
    info = generator.get_info()
    for key, value in info.items():
        print(f"  {key}: {value}")
    
    print(f"\n🆔 Generating 10 Snowflake IDs:")
    print(f"{'ID':<20} {'Binary (64-bit)':<68} {'Parsed Components'}")
    print("-" * 140)
    
    for i in range(10):
        # Generate ID
        snowflake_id = generator.generate_id()
        
        # Parse the ID
        parsed = generator.parse_id(snowflake_id)
        
        # Convert to binary for visualization
        binary = format(snowflake_id, '064b')
        
        # Format binary with sections
        sign_bit = binary[0]
        timestamp_bits = binary[1:42]
        dc_bits = binary[42:47]
        machine_bits = binary[47:52]
        sequence_bits = binary[52:64]
        
        formatted_binary = f"{sign_bit}|{timestamp_bits}|{dc_bits}|{machine_bits}|{sequence_bits}"
        
        components = f"DC:{parsed['datacenter_id']} M:{parsed['machine_id']} Seq:{parsed['sequence']}"
        
        print(f"{snowflake_id:<20} {formatted_binary:<68} {components}")
        
        # Small delay to show sequence incrementing
        if i % 3 == 0:
            time.sleep(0.001)
    
    print(f"\nBinary format: Sign(1)|Timestamp(41)|Datacenter(5)|Machine(5)|Sequence(12)")


def demo_multi_datacenter():
    """Demonstrate multiple datacenters and machines generating IDs simultaneously"""
    print("\n" + "=" * 60)
    print("MULTI-DATACENTER SIMULATION DEMO")
    print("=" * 60)
    
    # Create generators for different datacenters and machines
    generators = create_generator_pool(num_datacenters=3, machines_per_datacenter=2)
    
    print(f"\n🏢 Created {len(generators)} generators across 3 datacenters:")
    for key, gen in generators.items():
        dc_id, machine_id = gen.datacenter_id, gen.machine_id
        print(f"  {key}: Datacenter {dc_id}, Machine {machine_id}")
    
    print(f"\n🔄 Generating IDs from all generators simultaneously:")
    print(f"{'Generator':<10} {'ID':<20} {'Datacenter':<12} {'Machine':<8} {'Sequence':<8} {'Timestamp'}")
    print("-" * 80)
    
    # Generate IDs from each generator
    for key, generator in generators.items():
        for _ in range(3):
            snowflake_id = generator.generate_id()
            parsed = generator.parse_id(snowflake_id)
            
            print(f"{key:<10} {snowflake_id:<20} {parsed['datacenter_id']:<12} "
                  f"{parsed['machine_id']:<8} {parsed['sequence']:<8} {parsed['datetime']}")
            
            time.sleep(0.0001)  # Small delay


def demo_high_frequency_generation():
    """Demonstrate high-frequency ID generation and sequence behavior"""
    print("\n" + "=" * 60)
    print("HIGH-FREQUENCY GENERATION DEMO")
    print("=" * 60)
    
    generator = SnowflakeGenerator(datacenter_id=0, machine_id=1)
    
    print(f"\n⚡ Generating 20 IDs as fast as possible to show sequence increments:")
    print(f"{'ID':<20} {'Sequence':<10} {'Timestamp':<15} {'Time Diff (ms)'}")
    print("-" * 70)
    
    last_timestamp = None
    for i in range(20):
        snowflake_id = generator.generate_id()
        parsed = generator.parse_id(snowflake_id)
        
        time_diff = ""
        if last_timestamp:
            diff = parsed['timestamp'] - last_timestamp
            time_diff = f"+{diff}"
        
        print(f"{snowflake_id:<20} {parsed['sequence']:<10} {parsed['timestamp']:<15} {time_diff}")
        last_timestamp = parsed['timestamp']


def demo_concurrent_generation():
    """Demonstrate thread-safe concurrent ID generation"""
    print("\n" + "=" * 60)
    print("CONCURRENT GENERATION DEMO")
    print("=" * 60)
    
    generator = SnowflakeGenerator(datacenter_id=2, machine_id=3)
    generated_ids = []
    lock = threading.Lock()
    
    def generate_ids_worker(worker_id: int, count: int):
        """Worker function to generate IDs"""
        local_ids = []
        for _ in range(count):
            snowflake_id = generator.generate_id()
            local_ids.append((worker_id, snowflake_id))
        
        with lock:
            generated_ids.extend(local_ids)
    
    print(f"\n🧵 Using 5 threads to generate 100 IDs each (500 total)...")
    
    # Start concurrent generation
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(generate_ids_worker, i, 100) for i in range(5)]
        for future in futures:
            future.result()
    
    end_time = time.time()
    
    print(f"✅ Generated {len(generated_ids)} IDs in {end_time - start_time:.4f} seconds")
    print(f"📈 Rate: {len(generated_ids) / (end_time - start_time):.0f} IDs/second")
    
    # Verify uniqueness
    all_ids = [id_data[1] for id_data in generated_ids]
    unique_ids = set(all_ids)
    
    print(f"🔍 Uniqueness check: {len(unique_ids)} unique IDs out of {len(all_ids)} total")
    
    if len(unique_ids) == len(all_ids):
        print("✅ All IDs are unique!")
    else:
        print("❌ Found duplicate IDs!")
        
        # Find duplicates
        id_counts = Counter(all_ids)
        duplicates = [id_val for id_val, count in id_counts.items() if count > 1]
        print(f"   Duplicates: {len(duplicates)}")


def demo_id_analysis():
    """Analyze patterns in generated IDs"""
    print("\n" + "=" * 60)
    print("ID ANALYSIS DEMO")
    print("=" * 60)
    
    generator = SnowflakeGenerator(datacenter_id=1, machine_id=2)
    
    print(f"\n🔬 Analyzing 1000 generated IDs...")
    
    # Generate and collect data
    ids_data = []
    for _ in range(1000):
        snowflake_id = generator.generate_id()
        parsed = generator.parse_id(snowflake_id)
        ids_data.append(parsed)
    
    # Analyze patterns
    sequences = [data['sequence'] for data in ids_data]
    timestamps = [data['timestamp'] for data in ids_data]
    
    print(f"\n📊 Analysis Results:")
    print(f"  Total IDs generated: {len(ids_data)}")
    print(f"  Unique timestamps: {len(set(timestamps))}")
    print(f"  Sequence range: {min(sequences)} - {max(sequences)}")
    print(f"  Average sequence: {sum(sequences) / len(sequences):.2f}")
    
    # Group by timestamp to show sequence distribution
    timestamp_groups = defaultdict(list)
    for data in ids_data:
        timestamp_groups[data['timestamp']].append(data['sequence'])
    
    print(f"\n📈 Sequence distribution by timestamp (showing first 10):")
    print(f"{'Timestamp':<15} {'Count':<6} {'Sequences'}")
    print("-" * 50)
    
    for i, (timestamp, sequences) in enumerate(list(timestamp_groups.items())[:10]):
        seq_str = f"{min(sequences)}-{max(sequences)}" if len(sequences) > 1 else str(sequences[0])
        print(f"{timestamp:<15} {len(sequences):<6} {seq_str}")


def demo_bit_visualization():
    """Visualize the bit structure of snowflake IDs"""
    print("\n" + "=" * 60)
    print("BIT STRUCTURE VISUALIZATION")
    print("=" * 60)
    
    generator = SnowflakeGenerator(datacenter_id=15, machine_id=31)  # Use max values
    
    print(f"\n🔧 Bit structure breakdown for Snowflake IDs:")
    print(f"  Sign bit:      1 bit  (always 0)")
    print(f"  Timestamp:    41 bits (milliseconds since epoch)")
    print(f"  Datacenter:    5 bits (0-31 datacenters)")
    print(f"  Machine:       5 bits (0-31 machines per datacenter)")
    print(f"  Sequence:     12 bits (0-4095 per millisecond)")
    print(f"  Total:        64 bits")
    
    print(f"\n🔍 Example ID breakdown:")
    snowflake_id = generator.generate_id()
    parsed = generator.parse_id(snowflake_id)
    
    # Convert to binary
    binary = format(snowflake_id, '064b')
    
    print(f"\nID: {snowflake_id}")
    print(f"Binary: {binary}")
    print(f"        {'0':<1}{'1'*41:<41}{'1'*5:<5}{'1'*5:<5}{'1'*12:<12}")
    print(f"        S{'T'*41:<41}{'D'*5:<5}{'M'*5:<5}{'Q'*12:<12}")
    print(f"        {binary[0]:<1}{binary[1:42]:<41}{binary[42:47]:<5}{binary[47:52]:<5}{binary[52:64]:<12}")
    
    print(f"\nParsed components:")
    print(f"  Sign bit: {binary[0]} (always 0)")
    print(f"  Timestamp: {parsed['timestamp']} ({parsed['datetime']})")
    print(f"  Datacenter: {parsed['datacenter_id']}")
    print(f"  Machine: {parsed['machine_id']}")
    print(f"  Sequence: {parsed['sequence']}")


def main():
    """Run all demonstration functions"""
    print("🚀 TWITTER SNOWFLAKE ID GENERATION SYSTEM DEMO")
    print("This demo showcases the implementation of Twitter's distributed ID generation")
    
    # Run all demos
    demo_basic_usage()
    demo_multi_datacenter()
    demo_high_frequency_generation()
    demo_concurrent_generation()
    demo_id_analysis()
    demo_bit_visualization()
    
    print("\n" + "=" * 60)
    print("✨ DEMO COMPLETED")
    print("=" * 60)
    print("\nKey takeaways:")
    print("• Snowflake IDs are 64-bit integers with embedded metadata")
    print("• They guarantee uniqueness across distributed systems")
    print("• Each datacenter/machine can generate up to 4096 IDs per millisecond")
    print("• IDs are roughly sortable by generation time")
    print("• The system is thread-safe and handles clock skew")


if __name__ == "__main__":
    main() 