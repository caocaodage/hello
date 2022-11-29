import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import * as postgres from "https://deno.land/x/postgres@v0.14.0/mod.ts";
import { encode, decode } from "https://deno.land/std/encoding/base64.ts"

// Get the connection string from the environment variable "DATABASE_URL"
const databaseUrl = Deno.env.get("db_url")!;

// Create a database pool with three connections that are lazily established
const pool = new postgres.Pool(databaseUrl, 3, true);

BigInt.prototype.toJSON = function () { return this.toString() };


serve(async (req:Request,connInfo) => {
    const url = new URL(req.url);
    if(url.pathname=='/favicon.ico'){
      return new Response("Method Not Allowed", { status: 405 });
    }

    console.log(url,req);
    const connection = await pool.connect();
  
    try {
      if (url.pathname=="/saveTime") {
        let app=url.searchParams.get("app");
        let time=url.searchParams.get("time");
        let type=url.searchParams.get("type");
        let remark=url.searchParams.get("remark");

        const addr = connInfo.remoteAddr; 
        const ip = addr?.hostname||"";

        await connection.queryObject`
          INSERT INTO time (app , ip ,platform ,time,remark) VALUES (${app} , ${ip},${type},${time},${remark})
        `;
          // console.log("result",result)
          return new Response("ok", {});
      }
    } catch (err) {
      console.error(err);
      // If an error occurs, return a 500 response
      return new Response(`Internal Server Error\n\n${err.message}`, {
        status: 500,
      });
    } finally {
      // Release the connection back into the pool
      connection.release();
    }
  });