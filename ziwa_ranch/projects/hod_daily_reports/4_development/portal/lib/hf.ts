import { InferenceClient } from '@huggingface/inference'

let _client: InferenceClient | null = null

export function getHfClient(): InferenceClient {
  if (!_client) {
    _client = new InferenceClient(process.env.HF_TOKEN!)
  }
  return _client
}
