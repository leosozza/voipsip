import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

// MCP Server Setup
const server = new McpServer({
  name: "Bitrix Telephony MCP",
  version: "1.0.0",
});

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || "https://tequeyzhsixypnvevuiu.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""; // User must provide this
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Tool: make_call
 * Triggers a click-to-call event in Bitrix24
 */
server.tool(
  "make_call",
  {
    phoneNumber: z.string().describe("The phone number to dial"),
    companyId: z.string().describe("The company UUID from the database"),
    bitrixUserId: z.string().optional().describe("The Bitrix24 User ID (default: 1)"),
  },
  async ({ phoneNumber, companyId, bitrixUserId }) => {
    try {
      // We call the bitrix-sync function to register the call
      const { data, error } = await supabase.functions.invoke("bitrix-sync", {
        body: {
          action: "register",
          company_id: companyId,
          call_data: {
            PHONE_NUMBER: phoneNumber,
            USER_ID: bitrixUserId || "1",
            TYPE: 1, // Outbound
            SHOW: 1,
            CRM_CREATE: 1,
            CALL_START_DATE: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      return {
        content: [{ type: "text", text: `Call registered in Bitrix24. CALL_ID: ${data?.result?.CALL_ID}` }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error making call: ${err.message}` }],
      };
    }
  }
);

/**
 * Tool: get_call_logs
 * Fetches recent call logs
 */
server.tool(
  "get_call_logs",
  {
    companyId: z.string().describe("The company UUID"),
    limit: z.number().optional().default(10),
  },
  async ({ companyId, limit }) => {
    try {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching logs: ${err.message}` }],
      };
    }
  }
);

/**
 * Tool: get_companies
 * Returns a list of companies to help identify IDs
 */
server.tool(
  "get_companies",
  {},
  async () => {
    try {
      const { data, error } = await supabase.from("companies").select("id, name");
      if (error) throw error;

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching companies: ${err.message}` }],
      };
    }
  }
);

/**
 * Tool: search_contacts
 * Searches for CRM entities by phone number
 */
server.tool(
  "search_contacts",
  {
    phoneNumber: z.string().describe("The phone number to search for"),
    companyId: z.string().describe("The company UUID"),
  },
  async ({ phoneNumber, companyId }) => {
    try {
      const { data, error } = await supabase.functions.invoke("bitrix-sync", {
        body: {
          action: "search_crm",
          company_id: companyId,
          call_data: { phone_number: phoneNumber },
        },
      });

      if (error) throw error;

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error searching contacts: ${err.message}` }],
      };
    }
  }
);

/**
 * Tool: get_user_base_info
 * Returns Bitrix24 users list to help with mapping
 */
server.tool(
  "get_user_base_info",
  {
    companyId: z.string().describe("The company UUID"),
  },
  async ({ companyId }) => {
    try {
      const { data, error } = await supabase.functions.invoke("bitrix-sync", {
        body: {
          action: "get_users",
          company_id: companyId,
        },
      });

      if (error) throw error;

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching users: ${err.message}` }],
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Bitrix Telephony MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});