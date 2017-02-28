/*
** A lisp-like language. It's not intended to follow any lisp or functional programming rules/guidelines
** and it's similarity to lisp is just a side-effect of what I intended to create.
** There's a self-built lexer, as well as parser.
*/

class TokenType {
    constructor(regex, name, castFunc = (a) => a) {
        this.regex = regex;
        this.name = name;
        this.cast = castFunc;
    }

    //See where 'val' matches this token, and cast the value using the provided function
    match(val) {
        let matches = [];
        let res;
        while ((res = this.regex.exec(val)) !== null) {
            res[0] = this.cast(res[0])
            matches.push(res);
        } 
        return matches;
    }
}

//Token types. Precedence matters.
//If a letter is matched multiple times, only the first match is used.
tokenTypes = [
    new TokenType(/\"[^"]*\"/g, 'string'),
    new TokenType(/\s+/g, 'whitespace'),
    new TokenType(/[(]/g, 'openPar'),
    new TokenType(/[)]/g, 'closePar'),
    new TokenType(/[0-9]+/g, 'int', (a) => parseInt(a)),
    new TokenType(/[a-zA-Z]+/g, 'id')
];

//Token value types.
tokenValueTypes = ['int', 'string'];

class Token {
    constructor(tokenType, value, index) {
        this.tokenType = tokenType;
        this.value = value;
        this.index = index;
    }
}

//flatten polyfill
Array.prototype.flatten = function() {
    return this.reduce((a, b) => a.concat(b));
};

//peek polyfill
Array.prototype.peek = function() {
    return this[this.length - 1];
};

//Get tokens from input
const lex = (input) => {
    //Match the input to all tokens.
    let tokens = tokenTypes.map((type) => {
        return type.match(input).map((value) => {
            return new Token(type, value[0], value.index);
        });
    }).flatten();

    
    let str = [];
    //Remove duplicate matches, where the first match
    //is what's kept.
    tokens = tokens.filter((token) => {
        const startIndex = token.index;
        let shouldKeep = true;
        (token.value + '').split('').forEach((letter, index) => {
            if (str[startIndex + index]) {
                shouldKeep = false;
            } else {
                str[startIndex + index] = letter;
            }
        });
        return shouldKeep;
    });
    
    //Sort the tokens, where the first value is the first token in the string.
    tokens.sort((a, b) => {
        if (a.index < b.index)
            return -1;
        if (a.index > b.index)
            return 1;
        return 0;
    })

    //There was no lexing error, return the tokens.
    return tokens;
};

const builtins = {
    'plus' : {
        args: ['number', 'number'],
        func: (a, b) => a + b,
    },
    'plus' : {
        args: ['string', 'string'],
        func: (a, b) => a + b,
    },
    'minus' : {
        args: ['number', 'number'],
        func: (a, b) => a - b,
    },
};

const parse = (oldTokens) => {
    //Disregard whitespace
    const tokens = oldTokens.filter((token) => token.tokenType.name !== 'whitespace');

    //Parse through expressions, delimited by parenthesis
    let totalDepth = 0;
    let functionStack = [];
    let valueStack = [];
    let func = false; //Used to determine if next token should be a function
    tokens.forEach((token) => {
        if (totalDepth < 0)
            throw new Error(`Parsing error: too many close parenthesis`);
        if (func && token.tokenType.name === 'id') {
            functionStack.push(token.value);
            func = false;
        }
        if (!func && tokenValueTypes.indexOf(token.tokenType.name) !== -1) {
            valueStack.push(token.value);
        }
        //Build a new expression
        if (token.tokenType.name === 'openPar') {
            totalDepth++;
            func = true;
        }
        //Eval the expression
        if (token.tokenType.name === 'closePar') {
            totalDepth--;
            func = false;
            //Lookup the function
            const evaling = functionStack.pop();
            const foundFunc = builtins[evaling];
            if (!foundFunc)
                throw new Error(`Evaluation error: ${evaling} is not a valid function`);
            //Get the arguments to the function
            let args = []
            for (let argIndex = 0; argIndex < foundFunc.args.length; argIndex++) {
                if (valueStack.length < 1) {
                    throw new Error(`Evaluation error: ${evaling} expects ${foundFunc.args.length} arguments, but only got ${args.length}`);
                }
                if (typeof valueStack.peek() !== foundFunc.args[argIndex]) {
                    throw new Error(`Evaluation error: ${evaling} expects arg ${argIndex} to be a ${foundFunc.args[argIndex]} but it is a ${typeof valueStack.peek()}`)
                }
                args.push(valueStack.pop());
            }
            //Reverse the arguments, as they're backwards.
            args.reverse();
            //Call the function, and push the return to the valueStack
            const evaluated = foundFunc.func(...args);
            valueStack.push(evaluated);
        }
    });
    if (totalDepth !== 0)
        throw new Error(`Parsing error: parenthesis mismatch, depth:${totalDepth}, expected:0`);
    return valueStack.pop();
};

const evaluate = (inputText) => {
    const tokens = lex(inputText);
    return parse(tokens);
}

const test = () => {

    const text1 = '1';
    const tokens1 = lex(text1);
    const val1 = parse(tokens1);
    const expected1 = 1;
    const passed1 = expected1 === val1;
    console.log(`${text1} -> ${val1}, expected: ${expected1}| Passed: ${passed1}`);

    const text2 = '(plus 123 123)';
    const tokens2 = lex(text2);
    const val2 = parse(tokens2);
    const expected2 = 246;
    const passed2 = expected2 === val2;
    console.log(`${text2} -> ${val2}, expected: ${expected2}| Passed: ${passed2}`);

    const text3 = '(plus 1 (plus 2 3))';
    const tokens3 = lex(text3);
    const val3 = parse(tokens3);
    const expected3 = 6;
    const passed3 = expected3 === val3;
    console.log(`${text3} -> ${val3}, expected: ${expected3}| Passed: ${passed3}`);

    const text4 = '(minus 4 (plus 1 2))'
    const tokens4 = lex(text4);
    const val4 = parse(tokens4);
    const expected4 = 1;
    const passed4 = expected4 === val4;
    console.log(`${text4} -> ${val4}, expected: ${expected4}| Passed: ${passed4}`);

    const text5 = '(plus (minus 5 4) 2)';
    const tokens5 = lex(text5);
    const val5 = parse(tokens5);
    const expected5 = 3;
    const passed5 = expected5 === val5;
    console.log(`${text5} -> ${val5}, expected: ${expected5}| Passed: ${passed5}`);

    const text6 = '(plus "hi " "there")';
    const tokens6 = lex(text6);
    console.log(tokens6);
    const val6 = parse(tokens6);
    const expected6 = "hi there";
    const passed6 = expected6 === val6;
    console.log(`${text6} -> ${val6}, expected: ${expected6}| Passed: ${passed6}`);
};

test();