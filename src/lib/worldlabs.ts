/**
 * World Labs Marble API Client
 * 
 * Integration with World Labs' Marble platform for:
 * - Fetching world templates from the gallery
 * - Accessing world details and 3D assets
 * - Supporting multiple 3D formats (MPI, SPZ, PLY, panoramas)
 */

/**
 * Panorama metadata for layered rendering
 */
export interface PanoramaMetadata {
  uri: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
}

/**
 * SPZ (Splat) URLs at different resolutions
 */
export interface SpzUrls {
  "100k": string;
  "500k": string;
  full_res: string;
}

/**
 * Generation output containing all 3D asset URLs
 */
export interface GenerationOutput {
  collider_mesh_url: string;
  cond_image_url: string;
  mpi_url: string;
  panos_metadata: PanoramaMetadata[];
  ply_url: string;
  posed_cond_image: string;
  posed_cubemaps_url: string;
  posed_panos_url: string;
  skypano_url: string | null;
  spz_urls: SpzUrls;
  wlg_url: string;
}

/**
 * Generation input parameters
 */
export interface GenerationInput {
  model: string;
  seed: number | null;
  prompt: {
    image_prompt?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Application-specific metadata
 */
export interface ApplicationData {
  owner_username: string;
  owner_display_name: string;
  reactions: unknown | null;
  pinned: boolean;
}

/**
 * Permission settings for world access
 */
export interface Permission {
  public: boolean;
  allowed_readers: string[];
  allowed_writers: string[];
}

/**
 * World statistics
 */
export interface Stats {
  like_count: number;
  view_count: number;
}

/**
 * Complete World Labs world data structure
 */
export interface WorldLabsWorld {
  id: string;
  display_name: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  created_at: number;
  updated_at: number;
  owner_id: string;
  application_data: ApplicationData;
  generation_input: GenerationInput;
  generation_output: GenerationOutput;
  permission: Permission;
  stats: Stats;
  tags: string[];
  error: string | null;
}

/**
 * Simplified world template for UI display
 */
export interface WorldTemplate {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  tags: string[];
  stats: Stats;
  ownerName: string;
}

/**
 * World Labs API client configuration
 */
const WORLDLABS_API_BASE = "https://marble2-kgw-prod-iac1.wlt-ai.art";
const WORLDLABS_CDN_BASE = "https://cdn.marble.worldlabs.ai";

/**
 * Convert full world data to simplified template for UI
 */
export function worldToTemplate(world: WorldLabsWorld): WorldTemplate {
  // Extract thumbnail from MPI URL or use cond_image
  const thumbnailUrl = world.generation_output.cond_image_url;
  
  // Generate description from generation input if available
  const description = `A ${world.tags.join(", ")} world generated with ${world.generation_input.model}`;

  return {
    id: world.id,
    title: world.display_name,
    description,
    thumbnailUrl,
    tags: world.tags,
    stats: world.stats,
    ownerName: world.application_data.owner_display_name,
  };
}

/**
 * Fetch a list of public world templates from World Labs
 * Note: This endpoint needs to be discovered from network requests
 * 
 * @param filters - Optional filters (tags, search query, etc.)
 * @returns Array of world templates
 */
export async function fetchWorldTemplates(filters?: {
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<WorldTemplate[]> {
  try {
    // TODO: Replace with actual endpoint once discovered
    // Likely: GET /api/v1/worlds?public=true&tags=curated
    const params = new URLSearchParams();
    
    if (filters?.tags && filters.tags.length > 0) {
      params.append("tags", filters.tags.join(","));
    }
    
    if (filters?.search) {
      params.append("search", filters.search);
    }
    
    if (filters?.limit) {
      params.append("limit", filters.limit.toString());
    }
    
    if (filters?.offset) {
      params.append("offset", filters.offset.toString());
    }

    const url = `${WORLDLABS_API_BASE}/api/v1/worlds?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`World Labs API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Assuming response is { worlds: WorldLabsWorld[] }
    const worlds: WorldLabsWorld[] = data.worlds || data;
    
    // Filter only succeeded worlds
    const succeededWorlds = worlds.filter(w => w.status === "SUCCEEDED");
    
    return succeededWorlds.map(worldToTemplate);
  } catch (error) {
    console.error("Failed to fetch World Labs templates:", error);
    throw error;
  }
}

/**
 * Fetch detailed world data by ID
 * 
 * @param worldId - Unique world identifier
 * @returns Complete world data with all asset URLs
 */
export async function fetchWorldDetails(worldId: string): Promise<WorldLabsWorld> {
  try {
    // TODO: Replace with actual endpoint once discovered
    // Likely: GET /api/v1/worlds/{worldId}
    const url = `${WORLDLABS_API_BASE}/api/v1/worlds/${worldId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`World Labs API error: ${response.status} ${response.statusText}`);
    }

    const world: WorldLabsWorld = await response.json();
    
    if (world.status !== "SUCCEEDED") {
      throw new Error(`World ${worldId} is not ready (status: ${world.status})`);
    }
    
    return world;
  } catch (error) {
    console.error(`Failed to fetch world details for ${worldId}:`, error);
    throw error;
  }
}

/**
 * Get the best available 3D format for a world
 * Priority: SPZ (500k) > Panoramas > MPI > PLY
 * 
 * @param world - World data
 * @returns Object with format type and URL
 */
export function getBest3DFormat(world: WorldLabsWorld): {
  format: "spz" | "panoramas" | "mpi" | "ply" | "collider";
  url: string;
  metadata?: PanoramaMetadata[];
} {
  const output = world.generation_output;
  
  // Prefer SPZ (splat) format for quality and performance balance
  if (output.spz_urls?.["500k"]) {
    return {
      format: "spz",
      url: output.spz_urls["500k"],
    };
  }
  
  // Fallback to panoramas (easiest to render)
  if (output.posed_panos_url && output.panos_metadata?.length > 0) {
    return {
      format: "panoramas",
      url: output.posed_panos_url,
      metadata: output.panos_metadata,
    };
  }
  
  // MPI format
  if (output.mpi_url) {
    return {
      format: "mpi",
      url: output.mpi_url,
    };
  }
  
  // Point cloud
  if (output.ply_url) {
    return {
      format: "ply",
      url: output.ply_url,
    };
  }
  
  // Last resort: collider mesh (low quality but 3D)
  if (output.collider_mesh_url) {
    return {
      format: "collider",
      url: output.collider_mesh_url,
    };
  }
  
  throw new Error("No suitable 3D format found for world");
}

/**
 * Get panorama image URLs for multi-plane rendering
 * 
 * @param world - World data
 * @returns Array of panorama URLs with positions
 */
export async function getPanoramaUrls(world: WorldLabsWorld): Promise<Array<{
  url: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
}>> {
  const output = world.generation_output;
  
  if (!output.panos_metadata || output.panos_metadata.length === 0) {
    throw new Error("No panorama metadata available");
  }
  
  // Extract base URL from posed_panos_url
  // Format: https://cdn.marble.worldlabs.ai/{world_id}/{hash}_panos
  const baseUrl = output.posed_panos_url;
  
  return output.panos_metadata.map((pano) => ({
    url: `${baseUrl}/${pano.uri}`,
    position: pano.position,
    quaternion: pano.quaternion,
  }));
}

/**
 * Mock data for development/testing
 * Multiple example worlds from World Labs
 */
export const MOCK_WORLDS: WorldLabsWorld[] = [
  {
    id: "799ac993-86ab-4091-b326-86f3d54448e5",
    display_name: "Tropical sunset beach panorama",
    status: "SUCCEEDED",
    created_at: 1759184261,
    updated_at: 1759725467,
    owner_id: "HiGXvg9NRROTgvNj304H8BftFkG2",
    application_data: {
      owner_username: "ryk589",
      owner_display_name: "Ryan Kramer",
      reactions: null,
      pinned: false,
    },
    generation_input: {
      model: "Marble 0.1-plus",
      seed: null,
      prompt: {
        image_prompt: {},
      },
    },
    generation_output: {
      collider_mesh_url: "https://cdn.marble.worldlabs.ai/collider_meshes/799ac993-86ab-4091-b326-86f3d54448e5_collider.glb",
      cond_image_url: "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/654a8aa1_image_prompt.jpg",
      mpi_url: "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/979046e8-0f0b-48d5-99bd-23e863dded4e_dust_mpi",
      panos_metadata: [
        { uri: "rgb_0.png", position: [0, 0, 0], quaternion: [1, 0, 0, 0] },
        { uri: "rgb_1.png", position: [0, 0, -1.6666667461395264], quaternion: [1, 0, 0, 0] },
        { uri: "rgb_2.png", position: [0, 0, -3.3333334922790527], quaternion: [1, 0, 0, 0] },
        { uri: "rgb_3.png", position: [0, 0, -5], quaternion: [1, 0, 0, 0] },
      ],
      ply_url: "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/51150085-221a-4715-8dd2-64084466d826_ceramic.ply",
      posed_cond_image: "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/979cf088-316c-4b04-80ae-a7ae7cf74b42_cond_image",
      posed_cubemaps_url: "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/4d7ee336-9962-43b1-9b54-6ca0e61d4a13_cubemaps",
      posed_panos_url: "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/62e4d031-aba0-4ff7-b663-75f3dfd9f094_panos",
      skypano_url: null,
      spz_urls: {
        "100k": "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/8a5361c1-23ea-4601-a938-18609ded5a5a_dust_100k.spz",
        "500k": "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/9ba5eed6-6494-4607-85bf-4b4756cb4703_ceramic_500k.spz",
        full_res: "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/722e3ff2-5549-4cd7-91ab-fae6bba2c33f_ceramic.spz",
      },
      wlg_url: "https://cdn.marble.worldlabs.ai/799ac993-86ab-4091-b326-86f3d54448e5/66267534-adaa-4d8c-8f09-06347c91366a_dust.wlg",
    },
    permission: {
      public: true,
      allowed_readers: [],
      allowed_writers: [],
    },
    stats: {
      like_count: 2,
      view_count: 0,
    },
    tags: ["curated", "realism"],
    error: null,
  },
  {
    id: "dd368d4a-b8c8-4888-81de-e6b6fe5aabcd",
    display_name: "European Cafe Street",
    status: "SUCCEEDED",
    created_at: 1758727913,
    updated_at: 1759556068,
    owner_id: "gMMYwiOQnuaX05NAKFdMeIDDRCH2",
    application_data: {
      owner_username: "111ob111",
      owner_display_name: "omer breiner",
      reactions: null,
      pinned: false,
    },
    generation_input: {
      model: "Marble 0.1-plus",
      seed: null,
      prompt: {
        image_prompt: {},
      },
    },
    generation_output: {
      collider_mesh_url: "https://cdn.marble.worldlabs.ai/collider_meshes/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd_collider.glb",
      cond_image_url: "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/dd5a7139_image_prompt.jpg",
      mpi_url: "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/cbd3662e-3cc2-4d30-80e0-266277dcb400_dust_mpi",
      panos_metadata: [
        { uri: "rgb_0.png", position: [0, 0, 0], quaternion: [1, 0, 0, 0] },
        { uri: "rgb_1.png", position: [0, 0, -1.1444494724273682], quaternion: [1, 0, 0, 0] },
        { uri: "rgb_2.png", position: [0, 0, -2.2888989448547363], quaternion: [1, 0, 0, 0] },
        { uri: "rgb_3.png", position: [0, 0, -3.4333484172821045], quaternion: [1, 0, 0, 0] },
      ],
      ply_url: "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/911add0b-76b3-462f-a247-c4d58480cd2c_ceramic.ply",
      posed_cond_image: "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/41b9a6ea-e5b1-4cb7-b28a-e3856216e6fe_cond_image",
      posed_cubemaps_url: "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/bd417238-6dc0-438f-a3ff-bd74edcce0d9_cubemaps",
      posed_panos_url: "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/04265767-2bef-4acb-b6bd-4cd2641225d3_panos",
      skypano_url: null,
      spz_urls: {
        "100k": "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/16ba8969-a78c-4e9d-b30a-206e631843cb_dust_100k.spz",
        "500k": "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/4e962de3-e253-4edc-adc0-29d9987cda3f_ceramic_500k.spz",
        full_res: "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/b9274494-42ae-45fb-84e0-ddf861252ff4_ceramic.spz",
      },
      wlg_url: "https://cdn.marble.worldlabs.ai/dd368d4a-b8c8-4888-81de-e6b6fe5aabcd/7d729e73-48d1-4712-b547-2b46ed122c2a_dust.wlg",
    },
    permission: {
      public: true,
      allowed_readers: [],
      allowed_writers: [],
    },
    stats: {
      like_count: 5,
      view_count: 0,
    },
    tags: ["curated", "realism"],
    error: null,
  },
];

/**
 * Legacy: Single mock world for backward compatibility
 */
export const MOCK_WORLD = MOCK_WORLDS[0];

