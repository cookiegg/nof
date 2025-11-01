本文档介绍如何在阿里云百炼平台通过OpenAI兼容接口或DashScope SDK调用DeepSeek系列模型。

重要
本文档仅适用于中国大陆版（北京地域）。

模型列表
deepseek-v3.2-exp与deepseek-v3.1（可通过参数控制回复前是否思考）

deepseek-v3.2-exp 和 deepseek-v3.1 是混合思考模型，默认不开启思考模式。deepseek-v3.1在思考模式下，回答质量与 deepseek-r1-0528 持平。deepseek-v3.2-exp引入稀疏注意力机制，旨在提升处理长文本时的训练与推理效率，价格低于 deepseek-v3.1。

通过 enable_thinking 参数控制是否思考。
deepseek-r1（回复前总会思考）

deepseek-r1-0528 于 2025 年 5月发布，是 2025年1月发布 deepseek-r1 的升级版模型。新版模型在复杂推理任务中的表现有了显著提升；增加了推理过程中的思考深度，导致响应时间变长。

阿里云百炼的 deepseek-r1 模型现已升级至 0528 版本。
deepseek-r1-distill 系列模型是基于知识蒸馏技术，使用 deepseek-r1 生成的训练样本对 Qwen、Llama 等开源大模型进行微调训练后得到的模型。

deepseek-v3（回复前不思考）

deepseek-v3 模型，在 14.8T token 上进行了预训练，长文本、代码、数学、百科、中文能力上表现优秀。

于2024年12月26日发布，非2025年3月24日发布版本。
思考模式下，模型会先思考再回复，通过reasoning_content字段展示模型的思考步骤。相比于非思考模式，响应时长增加，但模型回复效果增强。

建议选择 deepseek-v3.2-exp 模型，该模型为 DeepSeek 最新模型，可按需选择是否开启思考模式，限流条件宽松，且价格低于 deepseek-v3.1。







模型名称

上下文长度

最大输入

最大思维链长度

最大回复长度

（Token数）

deepseek-v3.2-exp

685B 满血版
131,072

98,304

32,768

65,536

deepseek-v3.1

685B 满血版
deepseek-r1

685B 满血版
16,384

deepseek-r1-0528

685B 满血版
deepseek-v3

671B 满血版
131,072

-

蒸馏模型

最大思维链长度是模型在思考模式下，思考过程的最大 Token 数量。
以上模型非集成第三方服务，均部署在阿里云百炼服务器上。
并发限流请参考DeepSeek 限流条件。
快速开始
deepseek-v3.2-exp 是 DeepSeek 系列最新模型，支持通过enable_thinking参数设置思考与非思考模式。运行以下代码快速调用思考模式的 deepseek-v3.2-exp 模型。

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
            // 此处以 deepseek-v3.2-exp 为例，可按需更换模型名称为 deepseek-v3.1、deepseek-v3 或 deepseek-r1
            model: 'deepseek-v3.2-exp',
            messages,
            // 注意：在 Node.js SDK，enable_thinking 这样的非标准参数作为顶层属性传递，无需放在 extra_body 中
            // 该参数仅对 deepseek-v3.2-exp 和 deepseek-v3.1 有效。deepseek-v3 和 deepseek-r1 设定不会报错
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

唔，用户问了一个简单的自我介绍问题。这种问题很常见，需要快速清晰地表明身份和功能。考虑用轻松友好的语气介绍自己是DeepSeek-V3，并说明由深度求索公司创造。可以加上能提供的帮助类型，比如解答问题、聊天、学习辅导等，最后用表情符号增加亲和力。不需要过多解释，保持简洁明了就好。
====================完整回复====================

DeepSeek-V3，一个由深度求索公司创造的智能助手！我可以帮助你解答各种问题、提供建议、进行知识查询，甚至陪你聊天！无论是学习、工作还是日常生活中的疑问，尽管问我吧~✨有什么我可以帮你的吗？
====================Token 消耗====================

CompletionUsage(completion_tokens=140, prompt_tokens=4, total_tokens=144, completion_tokens_details=CompletionTokensDetails(accepted_prediction_tokens=None, audio_tokens=None, reasoning_tokens=79, rejected_prediction_tokens=None), prompt_tokens_details=None)
其它功能







模型

多轮对话

Function Calling

联网搜索

结构化输出

前缀续写

上下文缓存

deepseek-v3.2-exp

支持

支持

仅支持非思考模式。
支持

不支持

不支持

不支持

deepseek-v3.1

支持

支持

仅支持非思考模式。
支持

不支持

不支持

不支持

deepseek-r1

支持

支持

支持

不支持

不支持

不支持

deepseek-r1-0528

支持

支持

支持

不支持

不支持

不支持

deepseek-v3

支持

支持

支持

不支持

不支持

不支持

蒸馏模型

支持

不支持

不支持

不支持

不支持

不支持

参数默认值





模型

temperature

top_p

repetition_penalty

presence_penalty

deepseek-v3.2-exp

0.6

0.95

1.0

-

deepseek-v3.1

0.6

0.95

1.0

-

deepseek-r1

0.6

0.95

-

1

deepseek-r1-0528

0.6

0.95

-

1

蒸馏版

0.6

0.95

-

1

deepseek-v3

0.7

0.6

-

-

“-” 表示没有默认值，也不支持设置。

deepseek-r1、deepseek-r1-0528、蒸馏版模型不支持设置以上参数值。

计费说明
按照模型的输入与输出 Token 计费，价格详情请参考模型列表与价格。

思考模式下，思维链按照输出 Token 计费。
常见问题
免费额度用完后如何购买 Token？
访问费用与成本中心进行充值，确保您的账户没有欠费即可调用 DeepSeek 模型。

调用 DeepSeek 模型会自动扣费，出账周期为一小时，消费明细请前往账单详情进行查看。
如何接入Chatbox、Cherry Studio或Dify？
此处以使用较多的工具为例，其它大模型工具接入的方法较为类似。

ChatboxCherry StudioDify
请参见Chatbox。

可以上传图片或文档进行提问吗？
DeepSeek 模型仅支持文本输入，不支持输入图片或文档。通义千问VL模型支持图片输入，Qwen-Long模型支持文档输入。

如何查看Token消耗量及调用次数？
模型调用完一小时后，在模型观测页面设置查询条件（例如，选择时间范围、业务空间等），再在模型列表区域找到目标模型并单击操作列的监控，即可查看该模型的调用统计结果。具体请参见用量与性能观测文档。

数据按小时更新，高峰期可能有小时级延迟，请您耐心等待。
image

还有哪些使用DeepSeek的方式？
在百炼平台使用DeepSeek有三种方式：

在线体验：访问模型广场。

通过API或客户端（如Chatbox）调用模型：请参考本文内容。

0代码构建大模型应用：请参考智能体应用或工作流应用。