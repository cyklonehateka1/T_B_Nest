import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosError } from "axios";

export interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    repeat_penalty?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaError {
  error: string;
}

@Injectable()
export class OllamaClientService {
  private readonly logger = new Logger(OllamaClientService.name);
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly httpClient: AxiosInstance;
  private readonly maxRetries: number = 3;
  private readonly retryDelayMs: number = 1000;

  constructor(private readonly configService: ConfigService) {
    const ollamaUrl = this.configService.get<string>("OLLAMA_URL");
    if (!ollamaUrl) {
      this.logger.warn(
        "OLLAMA_URL is not set. Using default: http://localhost:11434",
      );
      this.baseUrl = "http://localhost:11434";
    } else {
      this.baseUrl = ollamaUrl;
    }

    this.defaultModel =
      this.configService.get<string>("OLLAMA_MODEL") ||
      "llama3.1:8b-instruct-q5_0";

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 2 minutes timeout for AI generation
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.logger.log(
      `Ollama client initialized - URL: ${this.baseUrl}, Model: ${this.defaultModel}`,
    );
  }

  /**
   * Generate response using Ollama
   */
  async generate(
    prompt: string,
    systemPrompt?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<OllamaResponse> {
    const model = options?.model || this.defaultModel;
    const request: OllamaRequest = {
      model,
      prompt,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.3, // Lower for more deterministic
        top_p: 0.9,
        top_k: 40,
        num_predict: options?.maxTokens ?? 2000,
        repeat_penalty: 1.1,
      },
    };

    return this.executeWithRetry(() => this.callOllama(request));
  }

  /**
   * Call Ollama API
   */
  private async callOllama(request: OllamaRequest): Promise<OllamaResponse> {
    try {
      this.logger.debug(
        `Calling Ollama API - Model: ${request.model}, Prompt length: ${request.prompt.length}`,
      );

      const startTime = Date.now();
      const response = await this.httpClient.post<OllamaResponse>(
        "/api/generate",
        request,
      );

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Ollama API call completed in ${duration}ms - Tokens: ${response.data.eval_count || "unknown"}`,
      );

      if (!response.data.done) {
        this.logger.warn("Ollama response marked as not done");
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<OllamaError>;
        if (axiosError.response) {
          const errorMessage =
            axiosError.response.data?.error || axiosError.message;
          this.logger.error(
            `Ollama API error (${axiosError.response.status}): ${errorMessage}`,
          );
          throw new Error(
            `Ollama API error: ${errorMessage} (Status: ${axiosError.response.status})`,
          );
        } else if (axiosError.request) {
          this.logger.error("Ollama API network error - no response received");
          throw new Error("Ollama API network error - service unavailable");
        }
      }

      this.logger.error(`Ollama API error: ${error.message}`, error.stack);
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  /**
   * Execute with exponential backoff retry
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 1,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        this.logger.error(
          `Max retries (${this.maxRetries}) reached for Ollama API call`,
        );
        throw error;
      }

      const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
      this.logger.warn(
        `Ollama API call failed (attempt ${attempt}/${this.maxRetries}). Retrying in ${delay}ms...`,
      );

      await this.sleep(delay);
      return this.executeWithRetry(fn, attempt + 1);
    }
  }

  /**
   * Health check - verify Ollama is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get("/api/tags", {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Ollama health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.httpClient.get<{
        models: Array<{ name: string }>;
      }>("/api/tags");
      return response.data.models.map((m) => m.name);
    } catch (error) {
      this.logger.error(`Failed to list Ollama models: ${error.message}`);
      return [];
    }
  }

  /**
   * Verify model is available
   */
  async verifyModel(model?: string): Promise<boolean> {
    const modelToCheck = model || this.defaultModel;
    const models = await this.listModels();
    const isAvailable = models.includes(modelToCheck);

    if (!isAvailable) {
      this.logger.warn(
        `Model ${modelToCheck} is not available. Available models: ${models.join(", ")}`,
      );
    }

    return isAvailable;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
