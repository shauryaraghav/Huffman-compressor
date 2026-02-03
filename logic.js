window.onload = function() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const statsSection = document.getElementById('stats');
    const vizContainer = document.getElementById('viz-container');

    if (dropZone) dropZone.addEventListener('click', () => fileInput.click());

    if (fileInput) {
        fileInput.onchange = function(e) {
            const file = e.target.files[0];
            if (file) processFile(file);
        };
    }

    function processFile(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const text = event.target.result;
            
            // 1. Run Algorithm
            const freqMap = getFrequencies(text);
            const root = buildTree(freqMap);
            const codes = {};
            generateCodes(root, "", codes);

            // 2. Update Stats & UI
            const stats = calculateCompressionStats(text, freqMap, codes);
            displayCompressionSummary(stats);
            updateUI(freqMap, codes);
            visualizeTree(root);

            // 3. Set up the Download Button
            const downloadBtn = document.getElementById('download-btn');
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    let binaryContent = "";
                    for (let char of text) { binaryContent += codes[char]; }
                    
                    const header = JSON.stringify(codes);
                    const finalContent = "HEADER:" + header + "\nDATA:" + binaryContent;
                    
                    const blob = new Blob([finalContent], { type: 'text/plain' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = "compressed_" + file.name;
                    link.click();
                };
            }
        };
        reader.readAsText(file);
    }

    // --- SUPPORT FUNCTIONS ---

    class Node {
        constructor(char, freq, left = null, right = null) {
            this.char = char;
            this.freq = freq;
            this.left = left;
            this.right = right;
        }
    }

    function getFrequencies(text) {
        const freq = {};
        for (let char of text) { freq[char] = (freq[char] || 0) + 1; }
        return freq;
    }

    function buildTree(freqMap) {
        let nodes = Object.entries(freqMap).map(([char, freq]) => new Node(char, freq));
        while (nodes.length > 1) {
            nodes.sort((a, b) => a.freq - b.freq);
            const left = nodes.shift();
            const right = nodes.shift();
            nodes.push(new Node(null, left.freq + right.freq, left, right));
        }
        return nodes[0];
    }

    function generateCodes(node, path, codes) {
        if (!node) return;
        if (node.char !== null) codes[node.char] = path;
        generateCodes(node.left, path + "0", codes);
        generateCodes(node.right, path + "1", codes);
    }

    function calculateCompressionStats(text, freqMap, codes) {
        const originalSize = text.length * 8;
        let compressedSize = 0;
        for (const char in freqMap) { compressedSize += freqMap[char] * codes[char].length; }
        const spaceSaved = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
        return { originalSize, compressedSize, spaceSaved };
    }

    function displayCompressionSummary(stats) {
        let summaryDiv = document.getElementById('compression-summary');
        if (!summaryDiv) {
            summaryDiv = document.createElement('div');
            summaryDiv.id = 'compression-summary';
            summaryDiv.className = 'card';
            summaryDiv.style.marginBottom = '20px';
            summaryDiv.style.gridColumn = '1 / span 2';
            statsSection.prepend(summaryDiv);
        }
        summaryDiv.innerHTML = `
            <h3>Compression Results</h3>
            <div style="display: flex; justify-content: space-around; padding: 10px; text-align: center;">
                <div><strong>Before:</strong><br>${stats.originalSize} bits</div>
                <div><strong>After:</strong><br>${stats.compressedSize} bits</div>
                <div style="color: #34a853;"><strong>Saved:</strong><br>${stats.spaceSaved}%</div>
            </div>
        `;
    }

    function updateUI(freqMap, codes) {
        statsSection.style.display = 'grid';
        vizContainer.style.display = 'block';
        const freqBody = document.querySelector('#freq-table tbody');
        const codeBody = document.querySelector('#code-table tbody');
        freqBody.innerHTML = Object.entries(freqMap).sort((a,b) => b[1]-a[1]).map(([c, f]) => `<tr><td>${c===' '?'Space':c==='\n'?'Enter':c}</td><td>${f}</td></tr>`).join('');
        codeBody.innerHTML = Object.entries(codes).map(([c, code]) => `<tr><td>${c===' '?'Space':c==='\n'?'Enter':c}</td><td><code>${code}</code></td></tr>`).join('');
    }

    function visualizeTree(data) {
        d3.select("#tree-viz").selectAll("*").remove();
        const width = 800, height = 400;
        const svg = d3.select("#tree-viz").append("svg").attr("width", "100%").attr("height", height).attr("viewBox", `0 0 ${width} ${height}`).append("g").attr("transform", "translate(40,40)");
        const treeLayout = d3.tree().size([width - 80, height - 150]);
        const root = d3.hierarchy(data, d => [d.left, d.right].filter(x => x));
        treeLayout(root);
        svg.selectAll('line').data(root.links()).enter().append('line').attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y).attr('stroke', '#ccc');
        const node = svg.selectAll('.node').data(root.descendants()).enter().append('g').attr('transform', d => `translate(${d.x},${d.y})`);
        node.append('circle').attr('r', 5).attr('fill', '#1a73e8');
        node.append('text').attr('dy', 20).attr('text-anchor', 'middle').attr('font-size', '11px').text(d => d.data.char ? `'${d.data.char}'` : d.data.freq);
    }
};