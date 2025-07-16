import { Config } from "../types.ts";
import { GitService } from "./git-service.ts";
import { PathResolver } from "./path-resolver.ts";
import { TaskService } from "./task-service.ts";
import { FileSystem } from "./file-system.ts";
import { TagsService } from "./tags-service.ts";
import { ConfigLoader } from "./config-loader.ts";
import { SearchService } from "./search-service.ts";
import { FormatService } from "./format-service.ts";
import { DefaultGitService } from "./git-service.ts";
import { DefaultPathResolver } from "./path-resolver.ts";
import { DefaultTaskService } from "./default-task-service.ts";
import { DefaultFileSystem } from "./default-file-system.ts";
import { DefaultTagsService } from "./default-tags-service.ts";
import { DefaultConfigLoader } from "./default-config-loader.ts";
import { DefaultSearchService } from "./default-search-service.ts";
import { DefaultFormatService } from "./default-format-service.ts";
import { I18nService } from "./i18n.ts";

/**
 * Service container for dependency injection
 */
export class ServiceContainer {
  private static instance: ServiceContainer | null = null;

  private config: Config | null = null;
  private configLoader: ConfigLoader | null = null;
  private gitService: GitService | null = null;
  private pathResolver: PathResolver | null = null;
  private taskService: TaskService | null = null;
  private fileSystem: FileSystem | null = null;
  private tagsService: TagsService | null = null;
  private searchService: SearchService | null = null;
  private i18nService: I18nService | null = null;
  private formatService: FormatService | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Initialize the container with configuration
   */
  async initialize(): Promise<void> {
    if (!this.config) {
      const configLoader = this.getConfigLoader();
      const result = await configLoader.loadConfig();
      if (!result.ok) {
        throw result.error;
      }
      this.config = result.value;
    }
  }

  /**
   * Get configuration
   */
  async getConfig(): Promise<Config> {
    if (!this.config) {
      await this.initialize();
    }
    return this.config!;
  }

  /**
   * Get ConfigLoader instance
   */
  getConfigLoader(): ConfigLoader {
    if (!this.configLoader) {
      const fileSystem = this.getFileSystem();
      this.configLoader = new DefaultConfigLoader(fileSystem);
    }
    return this.configLoader;
  }

  /**
   * Get GitService instance
   */
  getGitService(): GitService {
    if (!this.gitService) {
      this.gitService = new DefaultGitService();
    }
    return this.gitService;
  }

  /**
   * Get PathResolver instance
   */
  async getPathResolver(): Promise<PathResolver> {
    if (!this.pathResolver) {
      const config = await this.getConfig();
      this.pathResolver = new DefaultPathResolver(config);
    }
    return this.pathResolver;
  }

  /**
   * Get FileSystem instance
   */
  getFileSystem(): FileSystem {
    if (!this.fileSystem) {
      this.fileSystem = new DefaultFileSystem();
    }
    return this.fileSystem;
  }

  /**
   * Get TaskService instance
   */
  async getTaskService(): Promise<TaskService> {
    if (!this.taskService) {
      const config = await this.getConfig();
      const pathResolver = await this.getPathResolver();
      const gitService = this.getGitService();
      const fileSystem = this.getFileSystem();
      this.taskService = new DefaultTaskService(pathResolver, gitService, config, fileSystem);
    }
    return this.taskService;
  }

  /**
   * Get TagsService instance
   */
  async getTagsService(): Promise<TagsService> {
    if (!this.tagsService) {
      const pathResolver = await this.getPathResolver();
      const fileSystem = this.getFileSystem();
      this.tagsService = new DefaultTagsService(pathResolver, fileSystem);
    }
    return this.tagsService;
  }

  /**
   * Get I18nService instance
   */
  getI18nService(): I18nService {
    if (!this.i18nService) {
      throw new Error("I18n service not initialized. Call setI18nService first.");
    }
    return this.i18nService;
  }

  /**
   * Get SearchService instance
   */
  async getSearchService(): Promise<SearchService> {
    if (!this.searchService) {
      const taskService = await this.getTaskService();
      const pathResolver = await this.getPathResolver();
      const fileSystem = this.getFileSystem();
      this.searchService = new DefaultSearchService(taskService, pathResolver, fileSystem);
    }
    return this.searchService;
  }

  /**
   * Set I18nService instance
   */
  setI18nService(i18nService: I18nService): void {
    this.i18nService = i18nService;
  }

  /**
   * Get FormatService instance
   */
  getFormatService(): FormatService {
    if (!this.formatService) {
      const i18nService = this.getI18nService();
      this.formatService = new DefaultFormatService(i18nService);
    }
    return this.formatService;
  }

  /**
   * Set custom services for testing
   */
  setServices(services: {
    config?: Config;
    configLoader?: ConfigLoader;
    gitService?: GitService;
    pathResolver?: PathResolver;
    taskService?: TaskService;
    fileSystem?: FileSystem;
    tagsService?: TagsService;
    searchService?: SearchService;
    i18nService?: I18nService;
    formatService?: FormatService;
  }): void {
    if (services.config) this.config = services.config;
    if (services.configLoader) this.configLoader = services.configLoader;
    if (services.gitService) this.gitService = services.gitService;
    if (services.pathResolver) this.pathResolver = services.pathResolver;
    if (services.taskService) this.taskService = services.taskService;
    if (services.fileSystem) this.fileSystem = services.fileSystem;
    if (services.tagsService) this.tagsService = services.tagsService;
    if (services.searchService) this.searchService = services.searchService;
    if (services.i18nService) this.i18nService = services.i18nService;
    if (services.formatService) this.formatService = services.formatService;
  }

  /**
   * Reset the container (mainly for testing)
   */
  reset(): void {
    this.config = null;
    this.configLoader = null;
    this.gitService = null;
    this.pathResolver = null;
    this.taskService = null;
    this.fileSystem = null;
    this.tagsService = null;
    this.searchService = null;
    this.i18nService = null;
    this.formatService = null;
  }

  /**
   * Reset singleton instance (mainly for testing)
   */
  static resetInstance(): void {
    ServiceContainer.instance = null;
  }
}
