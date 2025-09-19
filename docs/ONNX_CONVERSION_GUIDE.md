# ONNX Conversion Guide for ReplySage

This guide explains how to convert and optimize AI models for use in the ReplySage browser extension using ONNX format.

## Overview

ReplySage uses small, efficient AI models that run locally in the browser. We convert popular models to ONNX format for optimal performance and compatibility with `onnxruntime-web`.

## Recommended Models

### 1. Summarization Model: Flan-T5-small
- **Purpose**: Generate short email summaries
- **Size**: ~60M parameters (~240MB)
- **Performance**: Good quality for short summaries, fast inference
- **Alternative**: Flan-T5-base (300M params) for better quality

### 2. Embeddings Model: all-MiniLM-L6-v2
- **Purpose**: Generate embeddings for similarity search
- **Size**: ~22M parameters (~90MB)
- **Performance**: Fast, good quality for semantic search
- **Dimensions**: 384

### 3. Grammar Model: T5-small
- **Purpose**: Grammar checking and text correction
- **Size**: ~60M parameters (~240MB)
- **Performance**: Good for basic grammar corrections

## Conversion Process

### Prerequisites

```bash
# Install required packages
pip install torch transformers onnx onnxruntime
pip install optimum[onnxruntime]
```

### 1. Convert Flan-T5-small to ONNX

```python
from transformers import T5Tokenizer, T5ForConditionalGeneration
from optimum.onnxruntime import ORTModelForSeq2SeqLM
import torch

# Load the model
model_name = "google/flan-t5-small"
tokenizer = T5Tokenizer.from_pretrained(model_name)
model = T5ForConditionalGeneration.from_pretrained(model_name)

# Convert to ONNX
onnx_model = ORTModelForSeq2SeqLM.from_pretrained(
    model_name,
    export=True,
    provider="CPUExecutionProvider"
)

# Save the model
onnx_model.save_pretrained("./models/flan-t5-small-onnx")
tokenizer.save_pretrained("./models/flan-t5-small-onnx")
```

### 2. Convert MiniLM Embeddings Model

```python
from transformers import AutoTokenizer, AutoModel
from optimum.onnxruntime import ORTModelForFeatureExtraction
import torch

# Load the model
model_name = "sentence-transformers/all-MiniLM-L6-v2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

# Convert to ONNX
onnx_model = ORTModelForFeatureExtraction.from_pretrained(
    model_name,
    export=True,
    provider="CPUExecutionProvider"
)

# Save the model
onnx_model.save_pretrained("./models/minilm-l6-v2-onnx")
tokenizer.save_pretrained("./models/minilm-l6-v2-onnx")
```

### 3. Quantization for Size Optimization

```python
from optimum.onnxruntime import ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig

# Quantize the model
quantizer = ORTQuantizer.from_pretrained("./models/flan-t5-small-onnx")
qconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False)

# Apply quantization
quantizer.quantize(
    save_dir="./models/flan-t5-small-onnx-quantized",
    quantization_config=qconfig
)
```

## Integration in Browser Extension

### 1. Install ONNX Runtime Web

```bash
npm install onnxruntime-web
```

### 2. Model Loading in Extension

```typescript
// src/utils/model-loader.ts
import * as ort from 'onnxruntime-web'

export class ModelLoader {
  private session: ort.InferenceSession | null = null
  private tokenizer: any = null

  async loadModel(modelPath: string) {
    try {
      // Load ONNX model
      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm']
      })
      
      // Load tokenizer (you'll need to implement this)
      this.tokenizer = await this.loadTokenizer(modelPath)
      
      console.log('Model loaded successfully')
    } catch (error) {
      console.error('Failed to load model:', error)
      throw error
    }
  }

  async generateSummary(text: string): Promise<string> {
    if (!this.session || !this.tokenizer) {
      throw new Error('Model not loaded')
    }

    // Tokenize input
    const inputs = this.tokenizer.encode(text, {
      return_tensors: 'np',
      max_length: 512,
      truncation: true
    })

    // Run inference
    const results = await this.session.run({
      input_ids: inputs.input_ids,
      attention_mask: inputs.attention_mask
    })

    // Decode output
    const summary = this.tokenizer.decode(results.logits[0], {
      skip_special_tokens: true
    })

    return summary
  }
}
```

### 3. Model Asset Management

```typescript
// src/utils/asset-manager.ts
export class AssetManager {
  private static readonly MODEL_BASE_URL = 'https://cdn.replysage.com/models/'
  
  static async downloadModel(modelName: string): Promise<void> {
    const modelUrl = `${this.MODEL_BASE_URL}${modelName}/model.onnx`
    const tokenizerUrl = `${this.MODEL_BASE_URL}${modelName}/tokenizer.json`
    
    // Download model files
    const [modelResponse, tokenizerResponse] = await Promise.all([
      fetch(modelUrl),
      fetch(tokenizerUrl)
    ])
    
    if (!modelResponse.ok || !tokenizerResponse.ok) {
      throw new Error('Failed to download model assets')
    }
    
    // Store in IndexedDB
    await this.storeModelAssets(modelName, {
      model: await modelResponse.arrayBuffer(),
      tokenizer: await tokenizerResponse.json()
    })
  }
  
  private static async storeModelAssets(name: string, assets: any) {
    const db = await this.openDB()
    const transaction = db.transaction(['models'], 'readwrite')
    const store = transaction.objectStore('models')
    
    await store.put({
      name,
      assets,
      timestamp: Date.now()
    })
  }
}
```

## Performance Optimization

### 1. Model Quantization

- Use INT8 quantization to reduce model size by ~4x
- Consider dynamic quantization for better quality
- Test quality vs size trade-offs

### 2. WebAssembly Optimization

```typescript
// Configure ONNX Runtime for optimal performance
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: [
    {
      name: 'wasm',
      options: {
        'wasm.simd': true,
        'wasm.threads': true
      }
    }
  ],
  graphOptimizationLevel: 'all',
  enableCpuMemArena: true
})
```

### 3. Caching Strategy

```typescript
// Cache model outputs to avoid recomputation
export class ModelCache {
  private cache = new Map<string, any>()
  
  async getCachedResult(input: string, modelType: string): Promise<any> {
    const key = this.generateKey(input, modelType)
    return this.cache.get(key)
  }
  
  async setCachedResult(input: string, modelType: string, result: any): Promise<void> {
    const key = this.generateKey(input, modelType)
    this.cache.set(key, result)
  }
}
```

## Model Deployment

### 1. CDN Setup

Upload converted models to a CDN:
```
models/
├── flan-t5-small-onnx/
│   ├── model.onnx
│   ├── tokenizer.json
│   └── config.json
├── minilm-l6-v2-onnx/
│   ├── model.onnx
│   ├── tokenizer.json
│   └── config.json
└── t5-small-grammar/
    ├── model.onnx
    ├── tokenizer.json
    └── config.json
```

### 2. Progressive Loading

```typescript
// Load models progressively based on user needs
export class ProgressiveModelLoader {
  async loadEssentialModels() {
    // Load only grammar model initially
    await this.loadModel('t5-small-grammar')
  }
  
  async loadAdvancedModels() {
    // Load summarization and embeddings on demand
    await Promise.all([
      this.loadModel('flan-t5-small-onnx'),
      this.loadModel('minilm-l6-v2-onnx')
    ])
  }
}
```

## Testing and Validation

### 1. Model Quality Testing

```python
# Test script for model quality
def test_model_quality():
    test_cases = [
        "Please review the attached document and provide feedback by Friday.",
        "Meeting scheduled for tomorrow at 2 PM in conference room A.",
        "The project deadline has been extended to next month."
    ]
    
    for text in test_cases:
        summary = model.generate_summary(text)
        print(f"Input: {text}")
        print(f"Summary: {summary}")
        print("---")
```

### 2. Performance Benchmarking

```typescript
// Benchmark model inference time
export class ModelBenchmark {
  async benchmarkModel(modelName: string, testInputs: string[]) {
    const loader = new ModelLoader()
    await loader.loadModel(modelName)
    
    const times = []
    for (const input of testInputs) {
      const start = performance.now()
      await loader.generateSummary(input)
      const end = performance.now()
      times.push(end - start)
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length
    console.log(`Average inference time: ${avgTime}ms`)
  }
}
```

## Troubleshooting

### Common Issues

1. **Model Loading Fails**
   - Check CORS headers on CDN
   - Verify model file integrity
   - Check browser compatibility

2. **Slow Inference**
   - Enable WebAssembly SIMD
   - Use quantized models
   - Implement proper caching

3. **Memory Issues**
   - Use model quantization
   - Implement model unloading
   - Monitor memory usage

### Debug Tools

```typescript
// Debug model loading and inference
export class ModelDebugger {
  static logModelInfo(session: ort.InferenceSession) {
    console.log('Model inputs:', session.inputNames)
    console.log('Model outputs:', session.outputNames)
  }
  
  static profileInference(fn: () => Promise<any>) {
    const start = performance.now()
    return fn().then(result => {
      const end = performance.now()
      console.log(`Inference took ${end - start}ms`)
      return result
    })
  }
}
```

## Next Steps

1. **Model Selection**: Choose the best models for your use case
2. **Conversion**: Convert models to ONNX format
3. **Optimization**: Apply quantization and other optimizations
4. **Integration**: Integrate models into the extension
5. **Testing**: Validate quality and performance
6. **Deployment**: Set up CDN and progressive loading

This guide provides a comprehensive approach to converting and optimizing AI models for use in the ReplySage browser extension. The key is to balance model quality with performance and size constraints.
