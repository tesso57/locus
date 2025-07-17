import { ok, Result } from "../../src/utils/result.ts";
import { Config } from "../../src/config/schema.ts";

export class MockConfigLoader {
  constructor(private config: Config) {}

  loadConfig(): Promise<Result<Config, Error>> {
    return Promise.resolve(ok(this.config));
  }
}
