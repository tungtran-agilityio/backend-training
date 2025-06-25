# Twitter Snowflake Distributed ID Generator

This project implements Twitter's snowflake approach for generating unique distributed IDs. The snowflake algorithm generates 64-bit unique IDs that are roughly sortable by time and can be generated across multiple datacenters and machines without coordination.

## Overview

The Twitter snowflake ID is a 64-bit integer composed of:

```
64-bit ID Structure:
┌─┬────────────────────────────────────────────┬─────┬─────┬────────────┐
│0│                Timestamp (41 bits)         │ DC  │ MC  │ Sequence   │
│ │                                            │(5b) │(5b) │   (12b)    │
└─┴────────────────────────────────────────────┴─────┴─────┴────────────┘
```

### Components

1. **Sign bit (1 bit)**: Always 0, reserved for future use
2. **Timestamp (41 bits)**: Milliseconds since custom epoch (default: Nov 04, 2010, 01:42:54 UTC)
3. **Datacenter ID (5 bits)**: Supports up to 32 datacenters (0-31)
4. **Machine ID (5 bits)**: Supports up to 32 machines per datacenter (0-31)
5. **Sequence (12 bits)**: Counter for IDs generated in the same millisecond (0-4095)
