# Bilibili to YouTube User Mapping

This directory contains sharded JSON files mapping Bilibili users to their YouTube channels.

## Structure

Files are organized using a Git-style hash-based sharding system:

```
b2y/
├── ab/
│   ├── cd/
│   │   ├── abcdef12.json
│   │   └── abcdef34.json
│   └── ef/
│       └── abef5678.json
├── 12/
│   └── 34/
│       └── 12345678.json
└── index.json
```

## File Format

Each JSON file contains a single user mapping:

```json
{
  "bilibiliUid": "123456",
  "bilibiliUsername": "Example User",
  "bilibiliAvatar": "https://...",
  "youtubeChannelId": "UCxxxxx",
  "youtubeChannelName": "Example Channel",
  "youtubeAvatar": "https://...",
  "verificationLevel": 1,
  "verifiedAt": "2025-12-16T00:00:00Z",
  "verifiedBy": "auto",
  "metadata": {
    "bilibiliFollowers": 1000000,
    "youtubeSubscribers": 500000,
    "avatarSimilarity": 0.95,
    "usernameSimilarity": 0.98,
    "bioMatch": true,
    "youtubeVerified": true,
    "matchingVideos": 5
  }
}
```

## Verification Levels

- **Level 1**: YouTube verified channel with matching name (highest confidence)
- **Level 2**: Cross-platform bio mentions
- **Level 3**: Username, avatar, video similarity (medium confidence)
- **Level 4**: Manual review required

## Index File

`index.json` maps user IDs to shard paths for fast lookup:

```json
{
  "123456": "ab/cd/abcdef12.json",
  "UCxxxxx": "ab/cd/abcdef12.json"
}
```

## Usage

The shard manager automatically handles file placement based on user ID hashing.
