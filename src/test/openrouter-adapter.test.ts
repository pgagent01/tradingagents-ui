import { describe,it,expect } from 'vitest';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText,Output } from 'ai';
import { z } from 'zod';
describe('OpenRouter streaming contract',()=>{
  it('uses chat completions and reads final streamed prompt/completion usage',async()=>{
    let path='',body:Record<string,unknown>={};
    const provider=createOpenAICompatible({name:'openrouter',baseURL:'https://openrouter.ai/api/v1',apiKey:'test-fixture-only',supportsStructuredOutputs:true,fetch:async(input,init)=>{
      path=String(input);body=JSON.parse(String(init?.body));
      const chunk=(delta:unknown,finish_reason:string|null,usage?:unknown)=>`data: ${JSON.stringify({id:'fixture',object:'chat.completion.chunk',created:1,model:'openai/gpt-4o-mini',choices:[{index:0,delta,finish_reason}],...(usage?{usage}:{})})}\n\n`;
      return new Response(chunk({role:'assistant',content:'{"summary":"Analyst synthesis"}'},null)+chunk({},'stop',{prompt_tokens:120,completion_tokens:25,total_tokens:145})+'data: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
    }});
    const result=streamText({model:provider('openai/gpt-4o-mini'),prompt:'Synthesize research.',output:Output.object({schema:z.object({summary:z.string()})}),maxRetries:0});
    for await(const part of result.fullStream){if(part.type==='error')throw part.error;}
    expect(path).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(body['model']).toBe('openai/gpt-4o-mini');expect(body['stream']).toBe(true);
    expect(body['response_format']).toMatchObject({type:'json_schema'});
    expect(await result.output).toEqual({summary:'Analyst synthesis'});
    expect(await result.totalUsage).toMatchObject({inputTokens:120,outputTokens:25,totalTokens:145});
  });
});