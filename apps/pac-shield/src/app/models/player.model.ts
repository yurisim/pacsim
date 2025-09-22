/**
 * Represents a player connected to a game session.
 *
 * The Player interface is used across the frontend to identify users,
 * associate them with sockets/sessions, and render display names in the UI.
 *
 * @interface
 */
export interface Player {
  /**
   * Unique identifier for the player (backend-generated).
   */
  id: string;

  /**
   * Human-readable display name chosen by the player.
   */
  name: string;

  /**
   * Unique session identifier used to correlate WebSocket and HTTP requests.
   */
  sessionId: string;
}
