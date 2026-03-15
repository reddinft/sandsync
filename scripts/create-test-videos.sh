#!/bin/bash

# Create test MP4 files with proper codec for QA testing
# Uses ffmpeg testsrc to generate valid video content

OUTPUT_DIR="/Users/loki/projects/sandsync/content/demo-captures-video"

for scenario in 1 2 3; do
  SCENARIO_DIR="$OUTPUT_DIR/scenario-$scenario"
  mkdir -p "$SCENARIO_DIR"
  
  OUTPUT_FILE="$SCENARIO_DIR/clip.mp4"
  
  echo "📹 Creating test video for Scenario $scenario..."
  
  # Generate a 60-second test video with proper H.264 codec
  ffmpeg -f lavfi -i testsrc=size=1920x1080:duration=60:rate=30 \
    -f lavfi -i sine=frequency=440:duration=60 \
    -c:v libx264 \
    -preset fast \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    "$OUTPUT_FILE" \
    -y \
    2>&1 | grep -E '(error|Error|Invalid|Unknown|Duration|frame=)' | tail -20
  
  if [ -f "$OUTPUT_FILE" ]; then
    SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE")
    echo "  ✅ Created: $OUTPUT_FILE (${SIZE})"
    echo "  ⏱️  Duration: ${DURATION}s"
  else
    echo "  ❌ Failed to create video"
  fi
  
  echo ""
done

echo "✅ All test videos created"
