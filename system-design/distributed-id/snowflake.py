import time
import threading
from typing import Optional


class SnowflakeGenerator:
    """
    Twitter Snowflake ID Generator Implementation
    
    64-bit ID structure:
    - Sign bit: 1 bit (always 0)
    - Timestamp: 41 bits (milliseconds since custom epoch)
    - Datacenter ID: 5 bits (0-31)
    - Machine ID: 5 bits (0-31)
    - Sequence: 12 bits (0-4095, reset every millisecond)
    """
    
    # Twitter snowflake epoch: Nov 04, 2010, 01:42:54 UTC
    TWITTER_EPOCH = 1288834974657
    
    # Bit lengths for each component
    TIMESTAMP_BITS = 41
    DATACENTER_ID_BITS = 5
    MACHINE_ID_BITS = 5
    SEQUENCE_BITS = 12
    
    # Maximum values for each component
    MAX_DATACENTER_ID = (1 << DATACENTER_ID_BITS) - 1  # 31
    MAX_MACHINE_ID = (1 << MACHINE_ID_BITS) - 1        # 31
    MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1             # 4095
    
    # Bit shifts for positioning
    MACHINE_ID_SHIFT = SEQUENCE_BITS                                    # 12
    DATACENTER_ID_SHIFT = SEQUENCE_BITS + MACHINE_ID_BITS              # 17
    TIMESTAMP_SHIFT = SEQUENCE_BITS + MACHINE_ID_BITS + DATACENTER_ID_BITS  # 22
    
    def __init__(self, datacenter_id: int, machine_id: int, custom_epoch: Optional[int] = None):
        """
        Initialize Snowflake Generator
        
        Args:
            datacenter_id: Datacenter identifier (0-31)
            machine_id: Machine identifier (0-31)
            custom_epoch: Custom epoch timestamp in milliseconds (optional)
        """
        if not (0 <= datacenter_id <= self.MAX_DATACENTER_ID):
            raise ValueError(f"Datacenter ID must be between 0 and {self.MAX_DATACENTER_ID}")
        
        if not (0 <= machine_id <= self.MAX_MACHINE_ID):
            raise ValueError(f"Machine ID must be between 0 and {self.MAX_MACHINE_ID}")
        
        self.datacenter_id = datacenter_id
        self.machine_id = machine_id
        self.epoch = custom_epoch or self.TWITTER_EPOCH
        
        # State tracking
        self.last_timestamp = -1
        self.sequence = 0
        
        # Thread safety
        self.lock = threading.Lock()
    
    def _current_timestamp(self) -> int:
        """Get current timestamp in milliseconds"""
        return int(time.time() * 1000)
    
    def _wait_for_next_millisecond(self, last_timestamp: int) -> int:
        """Wait until next millisecond"""
        timestamp = self._current_timestamp()
        while timestamp <= last_timestamp:
            timestamp = self._current_timestamp()
        return timestamp
    
    def generate_id(self) -> int:
        """
        Generate a new snowflake ID
        
        Returns:
            64-bit snowflake ID
        """
        with self.lock:
            timestamp = self._current_timestamp()
            
            # Check if time went backwards
            if timestamp < self.last_timestamp:
                raise RuntimeError(
                    f"Clock moved backwards. Refusing to generate ID for "
                    f"{self.last_timestamp - timestamp} milliseconds"
                )
            
            # Same millisecond - increment sequence
            if timestamp == self.last_timestamp:
                self.sequence = (self.sequence + 1) & self.MAX_SEQUENCE
                
                # Sequence overflow - wait for next millisecond
                if self.sequence == 0:
                    timestamp = self._wait_for_next_millisecond(self.last_timestamp)
            else:
                # New millisecond - reset sequence
                self.sequence = 0
            
            self.last_timestamp = timestamp
            
            # Build the ID
            timestamp_part = (timestamp - self.epoch) << self.TIMESTAMP_SHIFT
            datacenter_part = self.datacenter_id << self.DATACENTER_ID_SHIFT
            machine_part = self.machine_id << self.MACHINE_ID_SHIFT
            sequence_part = self.sequence
            
            snowflake_id = timestamp_part | datacenter_part | machine_part | sequence_part
            
            return snowflake_id
    
    def parse_id(self, snowflake_id: int) -> dict:
        """
        Parse a snowflake ID into its components
        
        Args:
            snowflake_id: The snowflake ID to parse
            
        Returns:
            Dictionary with timestamp, datacenter_id, machine_id, and sequence
        """
        # Extract components using bit masks and shifts
        sequence = snowflake_id & self.MAX_SEQUENCE
        machine_id = (snowflake_id >> self.MACHINE_ID_SHIFT) & self.MAX_MACHINE_ID
        datacenter_id = (snowflake_id >> self.DATACENTER_ID_SHIFT) & self.MAX_DATACENTER_ID
        timestamp = (snowflake_id >> self.TIMESTAMP_SHIFT) + self.epoch
        
        return {
            'id': snowflake_id,
            'timestamp': timestamp,
            'datetime': time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(timestamp / 1000)),
            'datacenter_id': datacenter_id,
            'machine_id': machine_id,
            'sequence': sequence
        }
    
    def get_info(self) -> dict:
        """Get generator configuration information"""
        return {
            'datacenter_id': self.datacenter_id,
            'machine_id': self.machine_id,
            'epoch': self.epoch,
            'epoch_datetime': time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(self.epoch / 1000)),
            'max_ids_per_ms': self.MAX_SEQUENCE + 1,
            'max_datacenters': self.MAX_DATACENTER_ID + 1,
            'max_machines_per_datacenter': self.MAX_MACHINE_ID + 1
        }


def create_generator_pool(num_datacenters: int = 2, machines_per_datacenter: int = 2) -> dict:
    """
    Create a pool of snowflake generators for demonstration
    
    Args:
        num_datacenters: Number of datacenters to simulate
        machines_per_datacenter: Number of machines per datacenter
        
    Returns:
        Dictionary of generators keyed by 'dc{datacenter_id}_m{machine_id}'
    """
    generators = {}
    
    for dc_id in range(num_datacenters):
        for machine_id in range(machines_per_datacenter):
            key = f"dc{dc_id}_m{machine_id}"
            generators[key] = SnowflakeGenerator(dc_id, machine_id)
    
    return generators 