import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Main application controller providing basic health checks and application metadata.
 * Serves as the root controller for general application endpoints.
 */
@Controller()
export class AppController {
  /**
   * Creates an instance of AppController.
   * @param appService - The application service for handling business logic
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Retrieves basic application data and metadata.
   * @returns Application information including name and version
   * @example GET /
   */
  @Get()
  getData() {
    return this.appService.getData();
  }

  /**
   * Performs a health check on the application and database connection.
   * Used for monitoring and ensuring the application is running properly.
   * @returns Health status including database connectivity
   * @example GET /health
   */
  @Get('health')
  checkHealth() {
    return this.appService.checkDbConnection();
  }
}
