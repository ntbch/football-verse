const fs = require('fs');
const path = require('path');

const matchesFile = path.join(__dirname, '..', 'src', 'app', 'matches', 'page.tsx');
let matchesContent = fs.readFileSync(matchesFile, 'utf8');
matchesContent = matchesContent.replace('</option>\n              )}', '</select>\n              )}');
fs.writeFileSync(matchesFile, matchesContent, 'utf8');
console.log('Fixed matches/page.tsx select closing tag');

const predictionsFile = path.join(__dirname, '..', 'src', 'app', 'predictions', 'page.tsx');
let predictionsContent = fs.readFileSync(predictionsFile, 'utf8');
predictionsContent = predictionsContent.replace('                  </div>\n                )}\n              </VStack>\n           </StackItem>', '                  </VStack>\n                )}\n              </VStack>\n           </StackItem>');
fs.writeFileSync(predictionsFile, predictionsContent, 'utf8');
console.log('Fixed predictions/page.tsx VStack closing tag');
