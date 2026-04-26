/**
 * Swiggy adapter interface — swap in a real client when an API/MCP is available.
 *
 * The app's routes, chat tools, and UI all talk to this interface only. To plug in a
 * real integration, implement `SwiggyAdapter` against the real API and export it from
 * `getSwiggyAdapter()` below based on an env-var flag.
 */

export interface SwiggyRestaurant {
  id: string
  name: string
  cuisines: string[]
  eta_minutes: number
  rating: number | null
  image_url: string | null
}

export interface SwiggyMenuItem {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  price_inr: number
  vegetarian: boolean
  estimated_calories: number | null
  estimated_protein_g: number | null
  estimated_carbs_g: number | null
  estimated_fat_g: number | null
}

export interface SwiggyOrderInput {
  restaurant_id: string
  items: Array<{ menu_item_id: string; quantity: number }>
  delivery_address?: string
  notes?: string
}

export interface SwiggyOrder {
  id: string
  restaurant_id: string
  status: "placed" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled"
  total_inr: number
  items: Array<{ name: string; quantity: number; price_inr: number }>
  placed_at: string
  tracking_url: string | null
}

export interface ConnectionStatus {
  connected: boolean
  account_id?: string
  connected_at?: string
}

export interface SwiggyAdapter {
  readonly id: string
  readonly displayName: string
  readonly isConfigured: boolean

  getConnectionStatus(userId: string): Promise<ConnectionStatus>
  startConnect(userId: string): Promise<{ redirect_url: string } | { error: string; code: number }>
  disconnect(userId: string): Promise<{ success: boolean }>

  searchRestaurants(
    userId: string,
    query: { text?: string; cuisine?: string; vegetarian?: boolean; max_calories?: number },
  ): Promise<SwiggyRestaurant[]>
  getMenu(userId: string, restaurantId: string): Promise<SwiggyMenuItem[]>
  placeOrder(userId: string, input: SwiggyOrderInput): Promise<SwiggyOrder>
  getOrder(userId: string, orderId: string): Promise<SwiggyOrder>
}

class NotConfiguredSwiggyAdapter implements SwiggyAdapter {
  readonly id = "not-configured"
  readonly displayName = "Swiggy (not configured)"
  readonly isConfigured = false

  private readonly err = {
    error: "Swiggy adapter not configured. Set SWIGGY_ADAPTER env var and provide credentials.",
    code: 501,
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return { connected: false }
  }
  async startConnect() {
    return this.err
  }
  async disconnect() {
    return { success: false }
  }
  async searchRestaurants(): Promise<SwiggyRestaurant[]> {
    throw new SwiggyNotConfiguredError()
  }
  async getMenu(): Promise<SwiggyMenuItem[]> {
    throw new SwiggyNotConfiguredError()
  }
  async placeOrder(): Promise<SwiggyOrder> {
    throw new SwiggyNotConfiguredError()
  }
  async getOrder(): Promise<SwiggyOrder> {
    throw new SwiggyNotConfiguredError()
  }
}

export class SwiggyNotConfiguredError extends Error {
  readonly code = "SWIGGY_NOT_CONFIGURED"
  constructor() {
    super("Swiggy integration is not configured on this server.")
  }
}

let cachedAdapter: SwiggyAdapter | null = null

/**
 * Returns the active Swiggy adapter. Currently returns the NotConfigured adapter;
 * to wire a real adapter:
 *   1. Implement SwiggyAdapter in `lib/swiggy/<your-impl>.ts`
 *   2. Branch on process.env.SWIGGY_ADAPTER here and return that implementation.
 */
export function getSwiggyAdapter(): SwiggyAdapter {
  if (cachedAdapter) return cachedAdapter
  // e.g. if (process.env.SWIGGY_ADAPTER === "mcp") cachedAdapter = new SwiggyMcpAdapter(...)
  cachedAdapter = new NotConfiguredSwiggyAdapter()
  return cachedAdapter
}
