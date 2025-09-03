(function(){
	const ta = document.getElementById('input');
	// 使用 7 个通用输出槽
	const out1 = document.getElementById('stat1');
	const out2 = document.getElementById('stat2');
	const out3 = document.getElementById('stat3');
	const out4 = document.getElementById('stat4');
	const out5 = document.getElementById('stat5');
	const out6 = document.getElementById('stat6');
	const out7 = document.getElementById('stat7');

	const btnClear = document.getElementById('clear');
	const btnCopy = document.getElementById('copy');
	const btnDownload = document.getElementById('download');

	// 新增：支持国旗按钮（data-lang="zh"/"en"/"auto"）或下拉选择回退
	const flags = document.querySelectorAll('[data-lang]');
	const modeSelect = document.getElementById('mode'); // 兼容先前页面变更（可能为空）
	const detectedEl = document.getElementById('detected');

	// 小工具：安全匹配 Unicode Han
	function matchHan(text){
		try{
			return text.match(/\p{Script=Han}/gu) || [];
		}catch(e){
			return text.match(/[\u4e00-\u9fff]/g) || [];
		}
	}
	// 句子计数（按常见句尾符号分割并过滤空段）
	function countSentences(text){
		if(!text || text.trim().length===0) return 0;
		const parts = text.split(/[.!?。！？;；]+/g).map(s=>s.trim()).filter(s=>s.length>0);
		return parts.length;
	}
	// 段落计数（两个或多个换行分段）
	function countParas(text){
		if(!text || text.trim().length===0) return 0;
		return text.split(/\n{2,}/).filter(p=>p.trim().length>0).length;
	}
	// 非空文本序列（以空白分隔的片段）
	function countNonEmptySequences(text){
		const arr = text.match(/\S+/g);
		return arr ? arr.length : 0;
	}
	// 标点计数（回退到非字母数字空白及汉字的字符）
	function countPunctuation(text){
		let p = 0;
		try{
			// Unicode 标点属性
			const m = text.match(/\p{P}/gu);
			if(m) p = m.length;
		}catch(e){
			// 回退：匹配非字母数字下划线空白和中文字符
			const m = text.match(/[^\w\s\u4e00-\u9fff]/g);
			if(m) p = m.length;
		}
		return p;
	}
	// 英文单词（拉丁序列）计数
	function countLatinWords(text){
		const m = text.match(/\b[A-Za-z0-9_']+\b/g);
		return m ? m.length : 0;
	}
	// 英文字母计数
	function countLetters(text){
		const m = text.match(/[A-Za-z]/g);
		return m ? m.length : 0;
	}
	// 文本计数（包括数字与中文）：将连续的英数或汉字序列视为一个文本单元
	function countTextUnits(text){
		const m = text.match(/([A-Za-z0-9]+|[\u4e00-\u9fff]+)/g);
		return m ? m.length : 0;
	}

	// 语言检测：返回 'zh' | 'en' | 'mixed' | 'auto'（空文本）
	function detectLanguage(text){
		if(!text || text.trim().length===0) return 'auto';
		const latin = countLatinWords(text);
		const han = matchHan(text).length;
		// 简单阈值判断
		if(han > latin * 1.2 && han > 5) return 'zh';
		if(latin > han * 1.2 && latin > 5) return 'en';
		return 'mixed';
	}

	// 只选择非 mode 的 stat 标签用于替换
	function setStatLabels(labels){
		const labelEls = document.querySelectorAll('.stats > .stat:not(.mode) .label');
		for(let i=0;i<labelEls.length && i<labels.length;i++){
			if(labels[i]) labelEls[i].textContent = labels[i];
		}
	}

	// 主计数函数（返回 7 个值）
	function computeAll(text, effectiveMode){
		const totalChars = text.length;
		const totalCharsNoSpace = text.replace(/\s+/g,'').length;
		const sentences = countSentences(text);
		const paras = countParas(text);
		const hanCount = matchHan(text).length;
		const latinWords = countLatinWords(text);
		const letters = countLetters(text);
		const textUnits = countTextUnits(text);
		const punctuation = countPunctuation(text);
		const nonEmptySeq = countNonEmptySequences(text);

		// 中文显示：
		// '汉字',
		// '无标点与空格',        => totalCharsNoSpace - punctuation
		// '不含空格',            => totalCharsNoSpace
		// '标点和符号',          => punctuation
		// '句数',                => sentences
		// '段数',                => paras
		// '总字符数'             => totalChars
		if(effectiveMode === 'zh'){
			const noPunctNoSpace = Math.max(0, totalCharsNoSpace - punctuation);
			return {
				labels: [
					'汉字',
					'无标点与空格',
					'不含空格',
					'标点和符号',
					'句数',
					'段数',
					'总字符数'
				],
				values: [
					hanCount,
					noPunctNoSpace,
					totalCharsNoSpace,
					punctuation,
					sentences,
					paras,
					totalChars
				],
				wordsForRead: Math.max(1, hanCount)
			};
		}

		// 英文显示：
		// '单词数',
		// '句数',
		// '段数',
		// '字母数',
		// '标点和符号',
		// '不含空格',
		// '总字符数'
		if(effectiveMode === 'en'){
			return {
				labels: [
					'单词数',
					'句数',
					'段数',
					'字母数',
					'标点和符号',
					'不含空格',
					'总字符数'
				],
				values: [
					latinWords,
					sentences,
					paras,
					letters,
					punctuation,
					totalCharsNoSpace,
					totalChars
				],
				wordsForRead: Math.max(1, latinWords)
			};
		}

		// 自动/混合：采用混合展示（中英合并计数）
		return {
			labels: [
				'单词数（中英混合）',
				'字符（含空格）',
				'非空文本数（含标点）',
				'句数',
				'段数',
				'总字符数',
				'备用'
			],
			values: [
				latinWords + hanCount,
				totalChars,
				nonEmptySeq,
				sentences,
				paras,
				totalChars,
				'' // 占位
			],
			wordsForRead: Math.max(1, latinWords + hanCount)
		};
	}

	// 更新 UI（标签与数值）
	function update(){
		const text = ta.value || '';
		let userMode = 'auto';
		let chosenFlag = null;
		if(flags && flags.length){
			for(const f of flags){
				if(f.getAttribute('aria-pressed') === 'true' || f.classList.contains('active')){
					chosenFlag = f.getAttribute('data-lang');
					break;
				}
			}
		}
		if(chosenFlag) userMode = chosenFlag;
		else if(modeSelect && modeSelect.value) userMode = modeSelect.value;

		const detected = detectLanguage(text);
		let effective = userMode === 'auto' ? (detected === 'mixed' ? 'auto' : detected) : userMode;

		// 更新检测显示（如果存在）
		if(detectedEl){
			let label = '检测: ';
			if(detected === 'zh') label += '中文';
			else if(detected === 'en') label += '英文';
			else if(detected === 'mixed') label += '混合/自动';
			else label += '自动';
			detectedEl.textContent = label;
		}

		const res = computeAll(text, effective);
		setStatLabels(res.labels);

		// 填入 7 个输出槽
		out1.textContent = res.values[0];
		out2.textContent = res.values[1];
		out3.textContent = res.values[2];
		out4.textContent = res.values[3];
		out5.textContent = res.values[4];
		out6.textContent = res.values[5];
		out7.textContent = res.values[6];

		// 阅读时间参考（使用返回的 wordsForRead，按 200 单位/分钟）
		const minutes = Math.max(1, Math.round((res.wordsForRead || 1) / 200));
		// 将估计阅读时间写入 mode 区提示（如果存在 detectedEl）
		if(detectedEl) detectedEl.title = '估计阅读时间: ' + minutes + ' 分钟';
	}

	// 事件绑定（保留原有行为）
	ta.addEventListener('input', update);
	window.addEventListener('load', update);

	btnClear.addEventListener('click', ()=>{
		ta.value = '';
		update();
		ta.focus();
	});

	btnCopy.addEventListener('click', async ()=>{
		try{
			await navigator.clipboard.writeText(ta.value);
		}catch(e){
			ta.select();
			document.execCommand('copy');
			window.getSelection().removeAllRanges();
		}
	});

	btnDownload.addEventListener('click', ()=>{
		const blob = new Blob([ta.value], {type:'text/plain;charset=utf-8'});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'text.txt';
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	});

	// 支持粘贴文件或拖放文本文件（基础）
	ta.addEventListener('paste', (e)=>{
		// 如果包含文件，读取第一个文本文件
		const items = (e.clipboardData && e.clipboardData.items) || [];
		for(const it of items){
			if(it.kind === 'file'){
				const f = it.getAsFile();
				if(f && f.type.startsWith('text')){
					const reader = new FileReader();
					reader.onload = (ev)=> {
						const pos = ta.selectionStart || 0;
						const before = ta.value.slice(0,pos);
						const after = ta.value.slice((ta.selectionEnd||pos));
						ta.value = before + ev.target.result + after;
						update();
					};
					reader.readAsText(f);
					e.preventDefault();
					return;
				}
			}
		}
	});

	// 可选：拖放文件到 textarea
	ta.addEventListener('dragover', (e)=> e.preventDefault());
	ta.addEventListener('drop', (e)=>{
		e.preventDefault();
		const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
		if(f && f.type.startsWith('text')){
			const reader = new FileReader();
			reader.onload = (ev)=>{ ta.value = ev.target.result; update(); };
			reader.readAsText(f);
		}
	});

	// 绑定国旗按钮（如果存在），点击设置 aria-pressed / active 并触发更新
	if(flags && flags.length){
		flags.forEach(f=>{
			f.setAttribute('role','button');
			f.setAttribute('aria-pressed','false');
			f.addEventListener('click', ()=>{
				// 清空其他 flag 状态
				flags.forEach(x=>{
					x.setAttribute('aria-pressed','false');
					x.classList.remove('active');
				});
				f.setAttribute('aria-pressed','true');
				f.classList.add('active');
				update();
			});
		});
	}

	// 如果页面仍有下拉选择，保持兼容
	if(modeSelect){
		modeSelect.addEventListener('change', update);
	}

	// 初始更新
	update();
})();