const fs = require('fs');
const path = require('path');

async function fetchAndClean() {
  console.log("Fetching VexBoost API...");
  try {
    const response = await fetch("https://vexboost.ru/api/v2?action=services&key=XIXEUVGftzSXwAg8PBerCJpMrg9qujHHPMATH3y95xYvBQ9VMnAHGYtpGnta");
    let text = await response.text();

    console.log("Raw response length:", text.length, "bytes");

    // Fix possible JSONP callback
    if (text.startsWith("callback(") || text.includes("NODEJS CALLBACK VEXBOOST")) {
       text = text.replace(/^.*?callback\(/, "").replace(/\)[^)]*$/, "");
    }
    
    let rawData;
    try {
      rawData = JSON.parse(text);
    } catch(e) {
      console.error("Failed to parse JSON", e.message);
      console.log("Snippet:", text.substring(0, 200));
      process.exit(1);
    }

    const servicesArray = Array.isArray(rawData) ? rawData : (rawData.data || rawData.services || Object.values(rawData));
    
    if (!Array.isArray(servicesArray)) {
      console.error("Could not extract an array of services.");
      process.exit(1);
    }

    console.log(`Found ${servicesArray.length} total services.`);

    const cleanServices = [];
    
    for (const item of servicesArray) {
      const status = (item.status || "").toLowerCase();
      if (status !== "active" && status !== "on" && status !== "1") {
        continue;
      }
      
      const minQty = parseInt(item.min) || parseInt(item.min_qty) || 10;
      const maxQty = parseInt(item.max) || parseInt(item.max_qty) || 10000;
      
      if (minQty > maxQty) {
        continue;
      }

      // Convert format
      cleanServices.push({
        id: item.service || item.id, // VexBoost usually uses 'service' as ID
        service: item.name || item.service || "Unnammed Service",
        type: item.type || "default",
        category: item.category || "Other",
        rate: parseFloat(item.rate) || 0,
        resell: parseFloat(item.resell || "300"), // default markup
        description: item.description || item.desc || "",
        link_type: item.link_type || "post",
        min_qty: minQty,
        max_qty: maxQty
      });
    }

    console.log(`Cleaned down to ${cleanServices.length} active valid services.`);

    const dir = path.join(__dirname, 'src', 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(dir, 'vexboost.json'), JSON.stringify(cleanServices, null, 2));
    console.log("Saved to src/data/vexboost.json");

  } catch(e) {
    console.error("Error executing fetchAndClean:", e);
  }
}

fetchAndClean();
