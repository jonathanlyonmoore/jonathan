/*
  Jonathanbot.js v.1.1 - Jonathan JS library (N.Landsteiner 2005)
  Jonathan is a mock Rogerian psychotherapist.
  Original program by Joseph Weizenbaum in MAD-SLIP for "Project MAC" at MIT.
  cf: Weizenbaum, Joseph "Jonathan - A Computer Program For the Study of Natural Language
      Communication Between Man and Machine"
      in: Communications of the ACM; Volume 9 , Issue 1 (January 1966): p 36-45.
  JavaScript implementation by Norbert Landsteiner 2005; <http://www.masserk.at>

  synopsis:

         new JonathanBot( <random-choice-disable-flag> )
         JonathanBot.prototype.transform( <inputstring> )
         JonathanBot.prototype.getInitial()
         JonathanBot.prototype.getFinal()
         JonathanBot.prototype.reset()

  usage: var Jonathan = new JonathanBot();
         var initial = Jonathan.getInitial();
         var reply = Jonathan.transform(inputstring);
         if (Jonathan.quit) {
             // last user input was a quit phrase
         }

         // method `transform()' returns a final phrase in case of a quit phrase
         // but you can also get a final phrase with:
         var final = Jonathan.getFinal();

         // other methods: reset memory and internal state
         Jonathan.reset();

         // to set the internal memory size override property `memSize':
         Jonathan.memSize = 100; // (default: 20)

         // to reproduce the example conversation given by J. Weizenbaum
         // initialize with the optional random-choice-disable flag
         var originalJonathan = new JonathanBot(true);

  `JonathanBot' is also a general chatbot engine that can be supplied with any rule set.
  (for required data structures cf. "Jonathandata.js" and/or see the documentation.)
  data is parsed and transformed for internal use at the creation time of the
  first instance of the `JonathanBot' constructor.

  vers 1.1: lambda functions in RegExps are currently a problem with too many browsers.
            changed code to work around.
*/


function JonathanBot(noRandomFlag) {
	this.noRandom= (noRandomFlag)? true:false;
	this.capitalizeFirstLetter=true;
	this.debug=false;
	this.memSize=20;
	this.version="1.1 (original)";
	if (!this._dataParsed) this._init();
	this.reset();
}

JonathanBot.prototype.reset = function() {
	this.quit=false;
	this.mem=[];
	this.lastchoice=[];
	for (var k=0; k<JonathanKeywords.length; k++) {
		this.lastchoice[k]=[];
		var rules=JonathanKeywords[k][2];
		for (var i=0; i<rules.length; i++) this.lastchoice[k][i]=-1;
	}
}

JonathanBot.prototype._dataParsed = false;

JonathanBot.prototype._init = function() {
	// install ref to global object
	var global=JonathanBot.prototype.global=self;
	// parse data and convert it from canonical form to internal use
	// prodoce synonym list
	var synPatterns={};
	if ((global.JonathanSynons) && (typeof JonathanSynons == 'object')) {
		for (var i in JonathanSynons) synPatterns[i]='('+i+'|'+JonathanSynons[i].join('|')+')';
	}
	// check for keywords or install empty structure to prevent any errors
	if ((!global.JonathanKeywords) || (typeof JonathanKeywords.length == 'undefined')) {
		JonathanKeywords=[['###',0,[['###',[]]]]];
	}
	// 1st convert rules to regexps
	// expand synonyms and insert asterisk expressions for backtracking
	var sre=/@(\S+)/;
	var are=/(\S)\s*\*\s*(\S)/;
	var are1=/^\s*\*\s*(\S)/;
	var are2=/(\S)\s*\*\s*$/;
	var are3=/^\s*\*\s*$/;
	var wsre=/\s+/g;
	for (var k=0; k<JonathanKeywords.length; k++) {
		var rules=JonathanKeywords[k][2];
		JonathanKeywords[k][3]=k; // save original index for sorting
		for (var i=0; i<rules.length; i++) {
			var r=rules[i];
			// check mem flag and store it as decomp's element 2
			if (r[0].charAt(0)=='$') {
				var ofs=1;
				while (r[0].charAt[ofs]==' ') ofs++;
				r[0]=r[0].substring(ofs);
				r[2]=true;
			}
			else {
				r[2]=false;
			}
			// expand synonyms (v.1.1: work around lambda function)
			var m=sre.exec(r[0]);
			while (m) {
				var sp=(synPatterns[m[1]])? synPatterns[m[1]]:m[1];
				r[0]=r[0].substring(0,m.index)+sp+r[0].substring(m.index+m[0].length);
				m=sre.exec(r[0]);
			}
			// expand asterisk expressions (v.1.1: work around lambda function)
			if (are3.test(r[0])) {
				r[0]='\\s*(.*)\\s*';
			}
			else {
				m=are.exec(r[0]);
				if (m) {
					var lp='';
					var rp=r[0];
					while (m) {
						lp+=rp.substring(0,m.index+1);
						if (m[1]!=')') lp+='\\b';
						lp+='\\s*(.*)\\s*';
						if ((m[2]!='(') && (m[2]!='\\')) lp+='\\b';
						lp+=m[2];
						rp=rp.substring(m.index+m[0].length);
						m=are.exec(rp);
					}
					r[0]=lp+rp;
				}
				m=are1.exec(r[0]);
				if (m) {
					var lp='\\s*(.*)\\s*';
					if ((m[1]!=')') && (m[1]!='\\')) lp+='\\b';
					r[0]=lp+r[0].substring(m.index-1+m[0].length);
				}
				m=are2.exec(r[0]);
				if (m) {
					var lp=r[0].substring(0,m.index+1);
					if (m[1]!='(') lp+='\\b';
					r[0]=lp+'\\s*(.*)\\s*';
				}
			}
			// expand white space
			r[0]=r[0].replace(wsre, '\\s+');
			wsre.lastIndex=0;
		}
	}
	// now sort keywords by rank (highest first)
	JonathanKeywords.sort(this._sortKeywords);
	// and compose regexps and refs for pres and posts
	JonathanBot.prototype.pres={};
	JonathanBot.prototype.posts={};
	if ((global.JonathanPres) && (JonathanPres.length)) {
		var a=new Array();
		for (var i=0; i<JonathanPres.length; i+=2) {
			a.push(JonathanPres[i]);
			JonathanBot.prototype.pres[JonathanPres[i]]=JonathanPres[i+1];
		}
		JonathanBot.prototype.preExp = new RegExp('\\b('+a.join('|')+')\\b');
	}
	else {
		// default (should not match)
		JonathanBot.prototype.preExp = /####/;
		JonathanBot.prototype.pres['####']='####';
	}
	if ((global.JonathanPosts) && (JonathanPosts.length)) {
		var a=new Array();
		for (var i=0; i<JonathanPosts.length; i+=2) {
			a.push(JonathanPosts[i]);
			JonathanBot.prototype.posts[JonathanPosts[i]]=JonathanPosts[i+1];
		}
		JonathanBot.prototype.postExp = new RegExp('\\b('+a.join('|')+')\\b');
	}
	else {
		// default (should not match)
		JonathanBot.prototype.postExp = /####/;
		JonathanBot.prototype.posts['####']='####';
	}
	// check for JonathanQuits and install default if missing
	if ((!global.JonathanQuits) || (typeof JonathanQuits.length == 'undefined')) {
		JonathanQuits=[];
	}
	// done
	JonathanBot.prototype._dataParsed=true;
}

JonathanBot.prototype._sortKeywords = function(a,b) {
	// sort by rank
	if (a[1]>b[1]) return -1
	else if (a[1]<b[1]) return 1
	// or original index
	else if (a[3]>b[3]) return 1
	else if (a[3]<b[3]) return -1
	else return 0;
}

JonathanBot.prototype.transform = function(text) {
	var rpl='';
	this.quit=false;
	// unify text string
	text=text.toLowerCase();
	text=text.replace(/@#\$%\^&\*\(\)_\+=~`\{\[\}\]\|:;<>\/\\\t/g, ' ');
	text=text.replace(/\s+-+\s+/g, '.');
	text=text.replace(/\s*[,\.\?!;]+\s*/g, '.');
	text=text.replace(/\s*\bbut\b\s*/g, '.');
	text=text.replace(/\s{2,}/g, ' ');
	// split text in part sentences and loop through them
	var parts=text.split('.');
	for (var i=0; i<parts.length; i++) {
		var part=parts[i];
		if (part!='') {
			// check for quit expression
			for (var q=0; q<JonathanQuits.length; q++) {
				if (JonathanQuits[q]==part) {
					this.quit=true;
					return this.getFinal();
				}
			}
			// preprocess (v.1.1: work around lambda function)
			var m=this.preExp.exec(part);
			if (m) {
				var lp='';
				var rp=part;
				while (m) {
					lp+=rp.substring(0,m.index)+this.pres[m[1]];
					rp=rp.substring(m.index+m[0].length);
					m=this.preExp.exec(rp);
				}
				part=lp+rp;
			}
			this.sentence=part;
			// loop trough keywords
			for (var k=0; k<JonathanKeywords.length; k++) {
				if (part.search(new RegExp('\\b'+JonathanKeywords[k][0]+'\\b', 'i'))>=0) {
					rpl = this._execRule(k);
				}
				if (rpl!='') return rpl;
			}
		}
	}
	// nothing matched try mem
	rpl=this._memGet();
	// if nothing in mem, so try xnone
	if (rpl=='') {
		this.sentence=' ';
		var k=this._getRuleIndexByKey('xnone');
		if (k>=0) rpl=this._execRule(k);
	}
	// return reply or default string
	return (rpl!='')? rpl : 'I am at a loss for words.';
}

JonathanBot.prototype._execRule = function(k) {
	var rule=JonathanKeywords[k];
	var decomps=rule[2];
	var paramre=/\(([0-9]+)\)/;
	for (var i=0; i<decomps.length; i++) {
		var m=this.sentence.match(decomps[i][0]);
		if (m!=null) {
			var reasmbs=decomps[i][1];
			var memflag=decomps[i][2];
			var ri= (this.noRandom)? 0 : Math.floor(Math.random()*reasmbs.length);
			if (((this.noRandom) && (this.lastchoice[k][i]>ri)) || (this.lastchoice[k][i]==ri)) {
				ri= ++this.lastchoice[k][i];
				if (ri>=reasmbs.length) {
					ri=0;
					this.lastchoice[k][i]=-1;
				}
			}
			else {
				this.lastchoice[k][i]=ri;
			}
			var rpl=reasmbs[ri];
			if (this.debug) alert('match:\nkey: '+JonathanKeywords[k][0]+
				'\nrank: '+JonathanKeywords[k][1]+
				'\ndecomp: '+decomps[i][0]+
				'\nreasmb: '+rpl+
				'\nmemflag: '+memflag);
			if (rpl.search('^goto ', 'i')==0) {
				ki=this._getRuleIndexByKey(rpl.substring(5));
				if (ki>=0) return this._execRule(ki);
			}
			// substitute positional params (v.1.1: work around lambda function)
			var m1=paramre.exec(rpl);
			if (m1) {
				var lp='';
				var rp=rpl;
				while (m1) {
					var param = m[parseInt(m1[1])];
					// postprocess param
					var m2=this.postExp.exec(param);
					if (m2) {
						var lp2='';
						var rp2=param;
						while (m2) {
							lp2+=rp2.substring(0,m2.index)+this.posts[m2[1]];
							rp2=rp2.substring(m2.index+m2[0].length);
							m2=this.postExp.exec(rp2);
						}
						param=lp2+rp2;
					}
					lp+=rp.substring(0,m1.index)+param;
					rp=rp.substring(m1.index+m1[0].length);
					m1=paramre.exec(rp);
				}
				rpl=lp+rp;
			}
			rpl=this._postTransform(rpl);
			if (memflag) this._memSave(rpl)
			else return rpl;
		}
	}
	return '';
}

JonathanBot.prototype._postTransform = function(s) {
	// final cleanings
	s=s.replace(/\s{2,}/g, ' ');
	s=s.replace(/\s+\./g, '.');
	if ((this.global.JonathanPostTransforms) && (JonathanPostTransforms.length)) {
		for (var i=0; i<JonathanPostTransforms.length; i+=2) {
			s=s.replace(JonathanPostTransforms[i], JonathanPostTransforms[i+1]);
			JonathanPostTransforms[i].lastIndex=0;
		}
	}
	// capitalize first char (v.1.1: work around lambda function)
	if (this.capitalizeFirstLetter) {
		var re=/^([a-z])/;
		var m=re.exec(s);
		if (m) s=m[0].toUpperCase()+s.substring(1);
	}
	return s;
}

JonathanBot.prototype._getRuleIndexByKey = function(key) {
	for (var k=0; k<JonathanKeywords.length; k++) {
		if (JonathanKeywords[k][0]==key) return k;
	}
	return -1;
}

JonathanBot.prototype._memSave = function(t) {
	this.mem.push(t);
	if (this.mem.length>this.memSize) this.mem.shift();
}

JonathanBot.prototype._memGet = function() {
	if (this.mem.length) {
		if (this.noRandom) return this.mem.shift();
		else {
			var n=Math.floor(Math.random()*this.mem.length);
			var rpl=this.mem[n];
			for (var i=n+1; i<this.mem.length; i++) this.mem[i-1]=this.mem[i];
			this.mem.length--;
			return rpl;
		}
	}
	else return '';
}

JonathanBot.prototype.getFinal = function() {
	if (!JonathanBot.prototype.global.JonathanFinals) return '';
	return JonathanFinals[Math.floor(Math.random()*JonathanFinals.length)];
}

JonathanBot.prototype.getInitial = function() {
	if (!JonathanBot.prototype.global.JonathanInitials) return '';
	return JonathanInitials[Math.floor(Math.random()*JonathanInitials.length)];
}


// fix array.prototype methods (push, shift) if not implemented (MSIE fix)
if (typeof Array.prototype.push == 'undefined') {
	Array.prototype.push=function(v) { return this[this.length]=v; };
}
if (typeof Array.prototype.shift == 'undefined') {
	Array.prototype.shift=function() {
		if (this.length==0) return null;
		var e0=this[0];
		for (var i=1; i<this.length; i++) this[i-1]=this[i];
		this.length--;
		return e0;
	};
}

// eof