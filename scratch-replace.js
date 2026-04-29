const fs = require('fs');
const file = 'd:/SMM_plan_2/src/components/landing/SmartLinkLanding.tsx';
let c = fs.readFileSync(file, 'utf8');

const targetStr = `                          className={\`group relative flex items-center justify-center gap-2.5 rounded-full font-bold text-[15px] origin-center shrink-0 transition-all duration-300 \${
                            isActive 
                              ? 'bg-sky-500 text-white shadow-[0_8px_24px_-6px_rgba(14,165,233,0.5)] h-12 md:h-14 px-5 md:px-6 scale-[1.02]'
                              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:shadow-md hover:text-slate-800 w-12 h-12 md:w-14 md:h-14 shadow-sm'
                          }\`}
                        >
                          <SocialIcon 
                            slug={net.slug} 
                            size={24}
                            className={\`shrink-0 z-10 transition-all duration-300 \${
                              isActive 
                               ? 'drop-shadow-sm scale-110 brightness-0 invert' 
                               : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'
                            }\`} 
                          />
                          {isActive && (
                            <span className="z-10 tracking-tight whitespace-nowrap">
                              {net.name}
                            </span>
                          )}`;

const replaceStr = `                          className={\`group relative flex flex-col items-center justify-center gap-1 font-bold text-[11px] origin-center shrink-0 transition-all duration-300 \${
                            isActive 
                              ? 'bg-sky-500 text-white shadow-[0_8px_24px_-6px_rgba(14,165,233,0.5)] rounded-2xl h-16 md:h-[72px] px-4 md:px-5 scale-[1.02]'
                              : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:shadow-md hover:text-slate-600 rounded-2xl w-16 h-16 md:w-[72px] md:h-[72px] shadow-sm'
                          }\`}
                        >
                          <SocialIcon 
                            slug={net.slug} 
                            size={22}
                            className={\`shrink-0 z-10 transition-all duration-300 \${
                              isActive 
                               ? 'drop-shadow-sm scale-110 brightness-0 invert' 
                               : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'
                            }\`} 
                          />
                          <span className={\`z-10 tracking-tight whitespace-nowrap transition-colors duration-200 \${
                            isActive ? 'text-white font-bold text-xs' : 'text-slate-400 group-hover:text-slate-600'
                          }\`}>
                            {isActive ? net.name : net.slug.length <= 3 ? net.slug.toUpperCase() : net.slug.charAt(0).toUpperCase() + net.slug.slice(1, 4)}
                          </span>`;

// Normalize endings for matching
const targetCrlf = targetStr.replace(/\n/g, '\r\n');

if (c.includes(targetStr)) {
  c = c.replace(targetStr, replaceStr);
  console.log('Replaced using LF');
} else if (c.includes(targetCrlf)) {
  // Normalize replace string to CRLF too
  c = c.replace(targetCrlf, replaceStr.replace(/\n/g, '\r\n'));
  console.log('Replaced using CRLF');
} else {
  console.log('Could not find target string in either format');
}

fs.writeFileSync(file, c);
