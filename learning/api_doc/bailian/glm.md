本文介绍了在阿里云百炼平台通过API调用 GLM 系列模型的方法。每个模型各有 100 万免费 Token。

模型列表
GLM 系列模型是智谱AI专为智能体设计的混合推理模型，提供思考与非思考两种模式。







模型名称

上下文长度

最大输入

最大思维链长度

最大回复长度

（Token数）

glm-4.6

202,752

169,984

32,768

16,384

glm-4.5

131,072

98,304

glm-4.5-air

GLM 系列模型仅支持通过流式输出方式调用。

以上模型非集成第三方服务，均部署在阿里云百炼服务器上。
快速开始
glm-4.6 是 GLM 系列最新模型，支持通过enable_thinking参数设置思考与非思考模式。运行以下代码快速调用思考模式的 glm-4.6 模型。

需要已获取API Key并完成配置API Key到环境变量。如果通过SDK调用，需要安装 OpenAI 或 DashScope SDK。

OpenAI兼容DashScope
说明
enable_thinking非 OpenAI 标准参数，OpenAI Python SDK 通过 extra_body传入，Node.js SDK 作为顶层参数传入。

PythonNode.jsHTTP
示例代码
 
import OpenAI from "openai";
import process from 'process';

// 初始化OpenAI客户端
const openai = new OpenAI({
    // 如果没有配置环境变量，请用阿里云百炼API Key替换：apiKey: "sk-xxx"
    apiKey: process.env.DASHSCOPE_API_KEY, 
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

let reasoningContent = ''; // 完整思考过程
let answerContent = ''; // 完整回复
let isAnswering = false; // 是否进入回复阶段

async function main() {
    try {
        const messages = [{ role: 'user', content: '你是谁' }];
        
        const stream = await openai.chat.completions.create({
            model: 'glm-4.6',
            messages,
            // 注意：在 Node.js SDK，enable_thinking 这样的非标准参数作为顶层属性传递，无需放在 extra_body 中
            enable_thinking: true,
            stream: true,
            stream_options: {
                include_usage: true
            },
        });

        console.log('\n' + '='.repeat(20) + '思考过程' + '='.repeat(20) + '\n');

        for await (const chunk of stream) {
            if (!chunk.choices?.length) {
                console.log('\n' + '='.repeat(20) + 'Token 消耗' + '='.repeat(20) + '\n');
                console.log(chunk.usage);
                continue;
            }

            const delta = chunk.choices[0].delta;
            
            // 只收集思考内容
            if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
                if (!isAnswering) {
                    process.stdout.write(delta.reasoning_content);
                }
                reasoningContent += delta.reasoning_content;
            }

            // 收到content，开始进行回复
            if (delta.content !== undefined && delta.content) {
                if (!isAnswering) {
                    console.log('\n' + '='.repeat(20) + '完整回复' + '='.repeat(20) + '\n');
                    isAnswering = true;
                }
                process.stdout.write(delta.content);
                answerContent += delta.content;
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
返回结果
 
====================思考过程====================

让我仔细思考用户的问题"你是谁"。这需要从多个角度来分析和回应。

首先，这是一个基础的身份认知问题。作为GLM大语言模型，需要准确表达自己的身份定位。应该清晰地说明自己是由智谱AI开发的AI助手。

其次，思考用户提出这个问题的可能意图。他们可能是初次接触，想了解基本功能；也可能想确认是否能提供特定帮助；或者只是想测试回应方式。因此需要给出一个开放且友好的回答。

还要考虑回答的完整性。除了身份介绍，也应该简要说明主要功能，如问答、创作、分析等，让用户了解可以如何使用这个助手。

最后，要确保语气友好亲和，表达出乐于帮助的态度。可以用"很高兴为您服务"这样的表达，让用户感受到交流的温暖。

基于这些思考，可以组织一个简洁明了的回答，既能回答用户问题，又能引导后续交流。
====================完整回复====================

我是GLM，由智谱AI训练的大语言模型。我通过大规模文本数据训练，能够理解和生成人类语言，帮助用户回答问题、提供信息和进行对话交流。

我会持续学习和改进，以提供更好的服务。很高兴能为您解答问题或提供帮助！有什么我能为您做的吗？
====================Token 消耗====================

{ prompt_tokens: 7, completion_tokens: 248, total_tokens: 255 }
模型功能







模型

多轮对话

Function Calling

结构化输出

联网搜索

前缀续写

上下文缓存

glm-4.6

支持

支持

支持

不支持

不支持

不支持

glm-4.5

支持

支持

支持

不支持

不支持

不支持

glm-4.5-air

支持

支持

支持

不支持

不支持

不支持

参数默认值






模型

enable_thinking

temperature

top_p

top_k

repetition_penalty

glm-4.6

true

1.0

0.95

20

1.0

glm-4.5

true

0.6

0.95

20

1.0

glm-4.5-air

true

0.6

0.95

20

1.0

计费说明
按照模型的输入与输出 Token 计费，价格详情请参考GLM。

思考模式下，思维链按照输出 Token 计费。