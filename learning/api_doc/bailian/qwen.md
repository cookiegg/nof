本文介绍通义千问 API 的输入输出参数。

模型介绍、选型建议和使用方法，请参考文本生成模型概述。
您可以通过 OpenAI 兼容或 DashScope 的方式调用通义千问 API。

OpenAI 兼容
北京地域新加坡地域金融云
使用SDK调用时需配置的base_url：https://dashscope.aliyuncs.com/compatible-mode/v1

使用HTTP方式调用时需配置的endpoint：POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions

您需要已获取API Key并配置API Key到环境变量。如果通过OpenAI SDK进行调用，还需要安装SDK。
请求体
文本输入流式输出图像输入视频输入工具调用联网搜索异步调用文档理解文字提取
此处以单轮对话作为示例，您也可以进行多轮对话。
PythonJavaNode.jsGoC#（HTTP）PHP（HTTP）curl
 
import OpenAI from "openai";

const openai = new OpenAI(
    {
        // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey: "sk-xxx",
        apiKey: process.env.DASHSCOPE_API_KEY,
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
);

async function main() {
    const completion = await openai.chat.completions.create({
        model: "qwen-plus",  //此处以qwen-plus为例，可按需更换模型名称。模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "你是谁？" }
        ],
    });
    console.log(JSON.stringify(completion))
}

main();
model string （必选）

模型名称。

支持的模型：通义千问大语言模型（商业版、开源版）、通义千问VL、代码模型、通义千问Omni、数学模型。

通义千问Audio暂不支持OpenAI兼容模式，仅支持DashScope方式。
具体模型名称和计费，请参见模型列表。

messages array （必选）

由历史对话组成的消息列表。

消息类型

System Message object （可选）

模型的目标或角色。如果设置系统消息，请放在messages列表的第一位。

属性

QwQ 、Qwen3-VL模型不建议设置 System Message，QVQ 模型设置System Message不会生效。
User Message object （必选）

用户发送给模型的消息。

属性

Assistant Message object （可选）

模型对用户消息的回复。

属性

Tool Message object （可选）

工具的输出信息。

属性

stream boolean （可选） 默认值为 false

是否流式输出回复。参数值：

false：模型生成完所有内容后一次性返回结果。

true：边生成边输出，即每生成一部分内容就立即输出一个片段（chunk）。您需要实时地逐个读取这些片段以获得完整的结果。

Qwen3商业版（思考模式）、Qwen3开源版、QwQ、QVQ只支持流式输出。
stream_options object （可选）

当启用流式输出时，可通过将本参数设置为{"include_usage": true}，在输出的最后一行显示所使用的Token数。

如果设置为false，则最后一行不显示使用的Token数。
本参数仅在设置stream为true时生效。

modalities array （可选）默认值为["text"]

输出数据的模态，仅支持 Qwen-Omni 模型指定。可选值：

["text","audio"]：输出文本与音频；

["text"]：输出文本。

audio object （可选）

输出音频的音色与格式，仅支持 Qwen-Omni 模型，且modalities参数需要包含"audio"。

属性

temperature float （可选）

采样温度，控制模型生成文本的多样性。

temperature越高，生成的文本更多样，反之，生成的文本更确定。

取值范围： [0, 2)

由于temperature与top_p均可以控制生成文本的多样性，因此建议您只设置其中一个值。更多说明，请参见文本生成模型概述。

temperature默认值

不建议修改QVQ模型的默认temperature值 。
top_p float （可选）

核采样的概率阈值，控制模型生成文本的多样性。

top_p越高，生成的文本更多样。反之，生成的文本更确定。

取值范围：（0,1.0]

由于temperature与top_p均可以控制生成文本的多样性，因此建议您只设置其中一个值。更多说明，请参见文本生成模型概述。

top_p默认值

不建议修改QVQ模型的默认 top_p 值。
top_k integer （可选）

生成过程中采样候选集的大小。例如，取值为50时，仅将单次生成中得分最高的50个Token组成随机采样的候选集。取值越大，生成的随机性越高；取值越小，生成的确定性越高。取值为None或当top_k大于100时，表示不启用top_k策略，此时仅有top_p策略生效。

取值需要大于或等于0。

top_k默认值

通过 Python SDK调用时，请将 top_k 放入 extra_body 对象中，配置方式为：extra_body={"top_k":xxx}。
不建议修改QVQ模型的默认 top_k 值。
presence_penalty float （可选）

控制模型生成文本时的内容重复度。

取值范围：[-2.0, 2.0]。正数会减少重复度，负数会增加重复度。

适用场景：

较高的presence_penalty适用于要求多样性、趣味性或创造性的场景，如创意写作或头脑风暴。

较低的presence_penalty适用于要求一致性或专业术语的场景，如技术文档或其他正式文档。

presence_penalty默认值

原理介绍

示例

使用qwen-vl-plus-2025-01-25模型进行文字提取时，建议设置presence_penalty为1.5。
不建议修改QVQ模型的默认presence_penalty值。
response_format object （可选） 默认值为{"type": "text"}

返回内容的格式。可选值：{"type": "text"}或{"type": "json_object"}。设置为{"type": "json_object"}时会输出标准格式的JSON字符串。使用方法请参见：结构化输出。

如果指定该参数为{"type": "json_object"}，您需要在System Message或User Message中指引模型输出JSON格式，如：“请按照json格式输出。”
支持的模型

max_input_tokens integer （可选）

允许输入的最大 Token 长度。目前仅支持qwen-plus-0728/latest模型。

qwen-plus-latest 默认值：129,024

后续默认值可能调整至1,000,000。
qwen-plus-2025-07-28 默认值：1,000,000

通过 Python SDK 调用时，请通过extra_body配置。配置方式为：extra_body={"max_input_tokens": xxx}。
max_tokens integer （可选）

本次请求返回的最大 Token 数。

max_tokens 的设置不会影响大模型的生成过程，如果模型生成的 Token 数超过max_tokens，本次请求会返回截断后的内容。
默认值和最大值都是模型的最大输出长度。关于各模型的最大输出长度，请参见模型列表。

max_tokens参数适用于需要限制字数（如生成摘要、关键词）、控制成本或减少响应时间的场景。

qwen-vl-ocr、qwen-vl-ocr-latest、qwen-vl-ocr-2025-04-13、qwen-vl-ocr-2025-08-28模型的max_tokens参数（最大输出长度）默认为 4096，如需提高该参数值（4097~8192范围），请发送邮件至 modelstudio@service.aliyun.com进行申请，并提供以下信息：主账号ID、图像类型（如文档图、电商图、合同等）、模型名称、预计 QPS 和每日请求总数，以及模型输出长度超过4096的请求占比。
对于 QwQ、QVQ 与开启思考模式的 Qwen3 模型，max_tokens会限制回复内容的长度，不限制深度思考内容的长度。
vl_high_resolution_images boolean （可选）默认值为false

是否提高输入图片的默认Token上限，适用于Qwen-VL、QVQ模型。

False（默认值）：使用默认的Token处理图像

Qwen3-VL商业版及开源版、qwen-vl-max-0813及以后、qwen-vl-plus-0710及以后更新的模型：默认Token上限为2560

QVQ及其他Qwen-VL模型：默认Token上限为1280

True：输入图片的Token上限将提高为16384

支持的模型

通过 Python SDK调用时，请将 vl_high_resolution_images 放入 extra_body 对象中，配置方式为：extra_body={"vl_high_resolution_images":xxx}。
n integer （可选） 默认值为1

生成响应的个数，取值范围是1-4。对于需要生成多个响应的场景（如创意写作、广告文案等），可以设置较大的 n 值。

当前仅支持 qwen-plus、 Qwen3（非思考模式）、qwen-plus-character 模型，且在传入 tools 参数时固定为1。
设置较大的 n 值不会增加输入 Token 消耗，会增加输出 Token 的消耗。
enable_thinking boolean （可选）

是否开启思考模式，适用于 Qwen3 、Qwen3-Omni-Flash、Qwen3-VL模型。

Qwen3 商业版模型默认值为 False，Qwen3 开源版模型默认值为 True。

通过 Python SDK 调用时，请通过extra_body配置。配置方式为：extra_body={"enable_thinking": xxx}。
thinking_budget integer （可选）

思考过程的最大长度，只在enable_thinking为true时生效。适用于Qwen3-VL、Qwen3 的商业版与开源版模型。详情请参见限制思考长度。

默认值为模型最大思维链长度。
通过 Python SDK 调用时，请通过extra_body配置。配置方式为：extra_body={"thinking_budget": xxx}。
seed integer （可选）

设置seed参数会使文本生成过程更具有确定性，通常用于使模型每次运行的结果一致。

在每次模型调用时传入相同的seed值（由您指定），并保持其他参数不变，模型将尽可能返回相同的结果。

取值范围：0到231−1。

seed默认值

logprobs boolean （可选）默认值为 false

是否返回输出 Token 的对数概率，可选值：

true

返回；

false

不返回。

思考阶段生成的内容（reasoning_content）不会返回对数概率。
支持的模型

top_logprobs integer （可选）默认值为0

指定在每一步生成时，返回模型最大概率的候选 Token 个数。

取值范围：[0,5]

仅当 logprobs 为 true 时生效。

stop string 或 array （可选）

使用stop参数后，当模型生成的文本即将包含指定的字符串或token_id时，将自动停止生成。

您可以在stop参数中传入敏感词来控制模型的输出。

stop为array类型时，不可以将token_id和字符串同时作为元素输入，比如不可以指定stop为["你好",104307]。
tools array （可选）

可供模型调用的工具数组，可以包含一个或多个工具对象。一次Function Calling流程模型会从中选择一个工具（开启parallel_tool_calls可以选择多个工具）。

目前不支持通义千问VL/Audio，也不建议用于数学和代码模型（Qwen3-Coder 模型除外）。
属性

tool_choice string 或 object （可选）默认值为 "auto"

如果您希望对于某一类问题，大模型能够采取制定好的工具选择策略（如强制使用某个工具、强制不使用工具），可以通过修改tool_choice参数来强制指定工具调用的策略。可选值：

"auto"

表示由大模型进行工具策略的选择。

"none"

如果您希望无论输入什么问题，Function Calling 都不会进行工具调用，可以设定tool_choice参数为"none"；

{"type": "function", "function": {"name": "the_function_to_call"}}

如果您希望对于某一类问题，Function Calling 能够强制调用某个工具，可以设定tool_choice参数为{"type": "function", "function": {"name": "the_function_to_call"}}，其中the_function_to_call是您指定的工具函数名称。

若模型输出思考过程，则不支持设置为该值。
parallel_tool_calls boolean （可选）默认值为 false

是否开启并行工具调用。参数为true时开启，为false时不开启。并行工具调用详情请参见：并行工具调用。

translation_options object （可选）

当您使用翻译模型时需要配置的翻译参数。

属性

若您通过Python SDK调用，请通过extra_body配置。配置方式为：extra_body={"translation_options": xxx}。
enable_search boolean （可选）

模型在生成文本时是否使用互联网搜索结果进行参考。取值如下：

true：启用互联网搜索，模型会将搜索结果作为文本生成过程中的参考信息，但模型会基于其内部逻辑判断是否使用互联网搜索结果。

如果模型没有搜索互联网，建议优化Prompt，或设置search_options中的forced_search参数开启强制搜索。
false（默认）：关闭互联网搜索。

启用互联网搜索功能可能会增加 Token 的消耗。
若您通过 Python SDK调用，请通过extra_body配置。配置方式为：extra_body={"enable_search": True}。
支持的模型

search_options object （可选）

联网搜索的策略。详情参见联网搜索。

属性

若您通过 Python SDK调用，请通过extra_body配置。配置方式为：extra_body={"search_options": xxx}。
X-DashScope-DataInspection string （可选）

在通义千问 API 的内容安全能力基础上，是否进一步识别输入输出内容的违规信息。取值如下：

'{"input":"cip","output":"cip"}'：进一步识别；

不设置该参数：不进一步识别。

通过 HTTP 调用时请放入请求头：-H "X-DashScope-DataInspection: {\"input\": \"cip\", \"output\": \"cip\"}"；

通过 Python SDK 调用时请通过extra_headers配置：extra_headers={'X-DashScope-DataInspection': '{"input":"cip","output":"cip"}'}。

详细使用方法请参见内容审核。

不支持通过 Node.js SDK设置。
不适用于 Qwen-VL 系列模型。
chat响应对象（非流式输出）
 
{
    "choices": [
        {
            "message": {
                "role": "assistant",
                "content": "我是阿里云开发的一款超大规模语言模型，我叫通义千问。"
            },
            "finish_reason": "stop",
            "index": 0,
            "logprobs": null
        }
    ],
    "object": "chat.completion",
    "usage": {
        "prompt_tokens": 3019,
        "completion_tokens": 104,
        "total_tokens": 3123,
        "prompt_tokens_details": {
            "cached_tokens": 2048
        }
    },
    "created": 1735120033,
    "system_fingerprint": null,
    "model": "qwen-plus",
    "id": "chatcmpl-6ada9ed2-7f33-9de2-8bb0-78bd4035025a"
}
id string

本次调用的唯一标识符。

choices array

模型生成内容的数组，可以包含一个或多个choices对象。

属性

created integer

本次chat请求被创建时的时间戳。

model string

本次chat请求使用的模型名称。

object string

始终为chat.completion。

service_tier string

该参数当前固定为null。

system_fingerprint string

该参数当前固定为null。

usage object

本次chat请求使用的 Token 信息。

属性

chat响应chunk对象（流式输出）
 
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[{"delta":{"content":"","function_call":null,"refusal":null,"role":"assistant","tool_calls":null},"finish_reason":null,"index":0,"logprobs":null}],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":null}
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[{"delta":{"content":"我是","function_call":null,"refusal":null,"role":null,"tool_calls":null},"finish_reason":null,"index":0,"logprobs":null}],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":null}
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[{"delta":{"content":"来自","function_call":null,"refusal":null,"role":null,"tool_calls":null},"finish_reason":null,"index":0,"logprobs":null}],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":null}
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[{"delta":{"content":"阿里","function_call":null,"refusal":null,"role":null,"tool_calls":null},"finish_reason":null,"index":0,"logprobs":null}],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":null}
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[{"delta":{"content":"云的超大规模","function_call":null,"refusal":null,"role":null,"tool_calls":null},"finish_reason":null,"index":0,"logprobs":null}],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":null}
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[{"delta":{"content":"语言模型，我","function_call":null,"refusal":null,"role":null,"tool_calls":null},"finish_reason":null,"index":0,"logprobs":null}],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":null}
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[{"delta":{"content":"叫通义千","function_call":null,"refusal":null,"role":null,"tool_calls":null},"finish_reason":null,"index":0,"logprobs":null}],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":null}
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[{"delta":{"content":"问。","function_call":null,"refusal":null,"role":null,"tool_calls":null},"finish_reason":null,"index":0,"logprobs":null}],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":null}
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[{"delta":{"content":"","function_call":null,"refusal":null,"role":null,"tool_calls":null},"finish_reason":"stop","index":0,"logprobs":null}],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":null}
{"id":"chatcmpl-e30f5ae7-3063-93c4-90fe-beb5f900bd57","choices":[],"created":1735113344,"model":"qwen-plus","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":null,"usage":{"completion_tokens":17,"prompt_tokens":22,"total_tokens":39,"completion_tokens_details":null,"prompt_tokens_details":{"audio_tokens":null,"cached_tokens":0}}}
id string

本次调用的唯一标识符。每个chunk对象有相同的 id。

choices array

模型生成内容的数组，可包含一个或多个choices对象。如果设置include_usage参数为true，则最后一个chunk为空。

属性

created integer

本次chat请求被创建时的时间戳。每个chunk对象有相同的时间戳。

model string

本次chat请求使用的模型名称。

object string

始终为chat.completion.chunk。

service_tier string

该参数当前固定为null。

system_fingerprintstring

该参数当前固定为null。

usage object

本次chat请求使用的Token信息。只在include_usage为true时，在最后一个chunk显示。

属性

DashScope
北京地域新加坡地域金融云
通过HTTP调用时需配置的endpoint：

使用通义千问大语言模型：POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

使用通义千问VL或通义千问Audio模型：POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation

您需要已获取API Key并配置API Key到环境变量。如果通过DashScope SDK进行调用，还需要安装DashScope SDK。
请求体
文本输入流式输出图像输入视频输入音频输入联网搜索工具调用异步调用文字提取深入研究文档理解
此处以单轮对话作为示例，您也可以进行多轮对话。
PythonJavaPHP（HTTP）Node.js（HTTP）C#（HTTP）Go（HTTP）curl
DashScope 未提供 Node.js 环境的 SDK。如需通过 OpenAI Node.js SDK调用，请参考本文的OpenAI章节。

 
import fetch from 'node-fetch';

const apiKey = process.env.DASHSCOPE_API_KEY;

const data = {
    model: "qwen-plus", // 此处以qwen-plus为例，可按需更换模型名称。模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
    input: {
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant."
            },
            {
                role: "user",
                content: "你是谁？"
            }
        ]
    },
    parameters: {
        result_format: "message"
    }
};

fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
.then(response => response.json())
.then(data => {
    console.log(JSON.stringify(data));
})
.catch(error => {
    console.error('Error:', error);
});
model string （必选）

模型名称。

支持的模型：通义千问大语言模型（商业版、开源版）、代码模型、通义千问VL、深入研究模型、通义千问Audio、数学模型

具体模型名称和计费，请参见模型列表。

messages array （必选）

由历史对话组成的消息列表。

通过HTTP调用时，请将messages 放入 input 对象中。
消息类型

temperature float （可选）

采样温度，控制模型生成文本的多样性。

temperature越高，生成的文本更多样，反之，生成的文本更确定。

取值范围： [0, 2)

temperature默认值

通过HTTP调用时，请将 temperature 放入 parameters 对象中。
不建议修改QVQ模型的默认 temperature 值。
top_p float （可选）

核采样的概率阈值，控制模型生成文本的多样性。

top_p越高，生成的文本更多样。反之，生成的文本更确定。

取值范围：（0,1.0]。

top_p默认值

Java SDK中为topP。通过HTTP调用时，请将 top_p 放入 parameters 对象中。
不建议修改QVQ模型的默认 top_p 值。
top_k integer （可选）

生成过程中采样候选集的大小。例如，取值为50时，仅将单次生成中得分最高的50个Token组成随机采样的候选集。取值越大，生成的随机性越高；取值越小，生成的确定性越高。取值为None或当top_k大于100时，表示不启用top_k策略，此时仅有top_p策略生效。

取值需要大于或等于0。

top_k默认值

Java SDK中为topK。通过HTTP调用时，请将 top_k 放入 parameters 对象中。
不建议修改QVQ模型的默认 top_k 值。
enable_thinking boolean （可选）

是否开启思考模式，适用于 Qwen3 、Qwen3-VL商业版与开源版、Qwen3-Omni-Flash模型

Qwen3 开源版默认值为 True，Qwen3 商业版模型默认值为 False。

Java SDK 为enableThinking；通过HTTP调用时，请将 enable_thinking 放入 parameters 对象中。
thinking_budget integer （可选）

思考过程的最大长度，在enable_thinking为true时生效，适用于 Qwen3 全系、Qwen3-VL模型。详情请参见限制思考长度。

默认值为模型最大思维链长度。
repetition_penalty float （可选）

模型生成时连续序列中的重复度。提高repetition_penalty时可以降低模型生成的重复度，1.0表示不做惩罚。没有严格的取值范围，只要大于0即可。

repetition_penalty默认值

Java SDK中为repetitionPenalty。通过HTTP调用时，请将 repetition_penalty 放入 parameters 对象中。
使用qwen-vl-plus、qwen-vl-plus_2025-01-25模型进行文字提取时，建议设置repetition_penalty为1.0。
对于通义千问OCR模型，repetition_penalty的默认值为1.05，该参数对模型效果影响较大，请勿随意修改。
不建议修改QVQ模型的默认 repetition_penalty 值。
presence_penalty float （可选）

控制模型生成文本时的内容重复度。

取值范围：[-2.0, 2.0]。正数会减少重复度，负数会增加重复度。

适用场景：

较高的presence_penalty适用于要求多样性、趣味性或创造性的场景，如创意写作或头脑风暴。

较低的presence_penalty适用于要求一致性或专业术语的场景，如技术文档或其他正式文档。

presence_penalty默认值

原理介绍

示例

使用qwen-vl-plus-2025-01-25模型进行文字提取时，建议设置presence_penalty为1.5。
不建议修改QVQ模型的默认presence_penalty值。
Java SDK不支持设置该参数。通过HTTP调用时，请将 presence_penalty 放入 parameters 对象中。
vl_high_resolution_images boolean （可选）默认值为false

是否提高输入图片的默认Token上限，适用于Qwen-VL、QVQ模型。

False（默认值）：使用默认的Token处理图像

Qwen3-VL商业版及开源版、qwen-vl-max-0813及以后、qwen-vl-plus-0710及以后更新的模型：默认Token上限为2560

QVQ及其他Qwen-VL模型：默认Token上限为1280

True：输入图片的Token上限将提高为16384

支持的模型

Java SDK 为 vlHighResolutionImages，Java SDK最低版本为2.20.8。通过HTTP调用时，请将 vl_high_resolution_images 放入 parameters 对象中。
vl_enable_image_hw_output boolean （可选）默认值为 false

是否返回图像缩放后的尺寸。模型会对输入的图像进行缩放处理，配置为 True 时会返回图像缩放后的高度和宽度，开启流式输出时，该信息在最后一个数据块（chunk）中返回。支持Qwen-VL模型。

Java SDK中为 vlEnableImageHwOutput，Java SDK最低版本为2.20.8。通过HTTP调用时，请将 vl_enable_image_hw_output 放入 parameters 对象中。
ocr_options object （可选）

当您使用通义千问OCR模型执行内置任务时需要配置的参数。

属性

Java SDK为OcrOptions，DashScope Python SDK 最低版本为1.22.2， Java SDK 最低版本为2.18.4。
通过HTTP调用时，请将 ocr_options 放入 parameters 对象中。
max_input_tokens integer （可选）

允许输入的最大 Token 长度。目前仅支持qwen-plus-0728/latest模型。

qwen-plus-latest 默认值：129,024

后续默认值可能调整至1,000,000。
qwen-plus-2025-07-28 默认值：1,000,000

Java SDK 暂不支持该参数。
max_tokens integer （可选）

本次请求返回的最大 Token 数。

max_tokens 的设置不会影响大模型的生成过程，如果模型生成的 Token 数超过max_tokens，本次请求会返回截断后的内容。
默认值和最大值都是模型的最大输出长度。关于各模型的最大输出长度，请参见模型列表。

max_tokens参数适用于需要限制字数（如生成摘要、关键词）、控制成本或减少响应时间的场景。

qwen-vl-ocr、qwen-vl-ocr-latest、qwen-vl-ocr-2025-04-13、qwen-vl-ocr-2025-08-28模型的max_tokens参数（最大输出长度）默认为 4096，如需提高该参数值（4097~8192范围），请发送邮件至 modelstudio@service.aliyun.com进行申请，并提供以下信息：主账号ID、图像类型（如文档图、电商图、合同等）、模型名称、预计 QPS 和每日请求总数，以及模型输出长度超过4096的请求占比。
对于 QwQ、QVQ 与开启思考模式的 Qwen3 模型，max_tokens会限制回复内容的长度，不限制深度思考内容的长度。
Java SDK中为maxTokens（模型为通义千问VL/OCR/Audio/ASR时，Java SDK中为maxLength，在 2.18.4 版本之后支持也设置为 maxTokens）。通过HTTP调用时，请将 max_tokens 放入 parameters 对象中。
seed integer （可选）

设置seed参数会使文本生成过程更具有确定性，通常用于使模型每次运行的结果一致。

在每次模型调用时传入相同的seed值（由您指定），并保持其他参数不变，模型将尽可能返回相同的结果。

取值范围：0到231−1。

seed默认值

通过HTTP调用时，请将 seed 放入 parameters 对象中。
stream boolean （可选）

是否流式输出回复。参数值：

false（默认值）：模型生成完所有内容后一次性返回结果。

true：边生成边输出，即每生成一部分内容就立即输出一个片段（chunk）。

该参数仅支持Python SDK。通过Java SDK实现流式输出请通过streamCall接口调用；通过HTTP实现流式输出请在Header中指定X-DashScope-SSE为enable。
Qwen3商业版（思考模式）、Qwen3开源版、QwQ、QVQ只支持流式输出。
incremental_output boolean （可选）默认为false（Qwen3-Max、Qwen3-VL、Qwen3 开源版、QwQ 、QVQ模型默认值为 true）

在流式输出模式下是否开启增量输出。推荐您优先设置为true。

参数值：

false：每次输出为当前已经生成的整个序列，最后一次输出为生成的完整结果。

 
I
I like
I like apple
I like apple.
true：增量输出，即后续输出内容不包含已输出的内容。您需要实时地逐个读取这些片段以获得完整的结果。

 
I
like
apple
.
Java SDK中为incrementalOutput。通过HTTP调用时，请将 incremental_output 放入 parameters 对象中。
QwQ 模型与思考模式下的 Qwen3 模型只支持设置为 true。由于 Qwen3 商业版模型默认值为false，您需要在思考模式下手动设置为 true。
Qwen3 开源版模型不支持设置为 false。
response_format object （可选） 默认值为{"type": "text"}

返回内容的格式。可选值：{"type": "text"}或{"type": "json_object"}。设置为{"type": "json_object"}时会输出标准格式的JSON字符串。使用方法请参见：结构化输出。

如果指定该参数为{"type": "json_object"}，您需要在 System Message 或 User Message 中指引模型输出 JSON 格式，如：“请按照json格式输出。”
Java SDK 中为 responseFormat。通过HTTP调用时，请将 response_format 放入 parameters 对象中。
支持的模型

output_format string （可选）默认值为"model_detailed_report"

仅当调用通义千问深入研究模型 qwen-deep-research 时，用于规定输出内容格式。

可选值：

"model_detailed_report"：详细研究报告，约6000字

"model_summary_report"：摘要研究报告，约1500-2000字

result_format string （可选） 默认为"text"（Qwen3-Max、Qwen3-VL、QwQ 模型、Qwen3 开源模型（除了qwen3-next-80b-a3b-instruct）与 Qwen-Long 模型默认值为 "message"）

返回数据的格式。推荐您优先设置为"message"，可以更方便地进行多轮对话。

平台后续将统一将默认值调整为"message"。
Java SDK中为resultFormat。通过HTTP调用时，请将 result_format 放入 parameters 对象中。
模型为通义千问VL/QVQ/OCR/Audio/ASR时，设置“text”不生效。
Qwen3-Max、Qwen3-VL、思考模式下的 Qwen3 模型只能设置为"message"，由于 Qwen3 商业版模型默认值为"text"，您需要将其设置为"message"。
如果您使用 Java SDK 调用Qwen3 开源模型，并且传入了 "text"，依然会以 "message"格式进行返回。
logprobs boolean （可选）默认值为 false

是否返回输出 Token 的对数概率，可选值：

true

返回；

false

不返回。

思考阶段生成的内容（reasoning_content）不会返回对数概率。
支持 qwen-plus、qwen-turbo 系列的快照模型（不包含主线模型）与 Qwen3 开源模型。
top_logprobs integer （可选）默认值为0

指定在每一步生成时，返回模型最大概率的候选 Token 个数。

取值范围：[0,5]

仅当 logprobs 为 true 时生效。

n integer （可选） 默认值为1

生成响应的个数，取值范围是1-4。对于需要生成多个响应的场景（如创意写作、广告文案等），可以设置较大的 n 值。

当前仅支持 qwen-plus、 Qwen3（非思考模式）、qwen-plus-character 模型，且在传入 tools 参数时固定为1。
设置较大的 n 值不会增加输入 Token 消耗，会增加输出 Token 的消耗。
stop string 或 array （可选）

使用stop参数后，当模型生成的文本即将包含指定的字符串或token_id时，将自动停止生成。

您可以在stop参数中传入敏感词来控制模型的输出。

stop为array类型时，不可以将token_id和字符串同时作为元素输入，比如不可以指定stop为["你好",104307]。
tools array （可选）

可供模型调用的工具数组，可以包含一个或多个工具对象。一次 Function Calling 流程模型会从中选择其中一个工具（开启parallel_tool_calls参数可能选择多个工具）。使用 tools 时需要同时指定result_format参数为"message"。无论是发起 Function Calling，还是向模型提交工具函数的执行结果，均需设置tools参数。

目前不支持通义千问VL/Audio，也不建议用于数学和代码模型（Qwen3-Coder 模型除外）。
属性

通过HTTP调用时，请将 tools 放入 parameters JSON 对象中。暂时不支持qwen-vl与qwen-audio系列模型。
tool_choice string 或 object （可选）

在使用tools参数时，用于控制模型调用指定工具。有三种取值：

"none"表示不调用工具。tools参数为空时，默认值为"none"。

"auto"表示由模型判断是否调用工具，可能调用也可能不调用。tools参数不为空时，默认值为"auto"。

object结构可以指定模型调用的工具。例如tool_choice={"type": "function", "function": {"name": "user_function"}}。

若模型输出思考过程，则不支持设置为该值。
type只支持指定为"function"。

function

name表示期望被调用的工具名称，例如"get_current_time"。

Java SDK中为toolChoice。通过HTTP调用时，请将 tool_choice 放入 parameters 对象中。
parallel_tool_calls boolean （可选）默认值为 false

是否开启并行工具调用。参数为true时开启，为false时不开启。并行工具调用详情请参见：并行工具调用。

translation_options object （可选）

当您使用翻译模型时需要配置的翻译参数。

属性

Java SDK中为translationOptions。通过HTTP调用时，请将 translation_options 放入 parameters 对象中。
enable_search boolean （可选）

模型在生成文本时是否使用互联网搜索结果进行参考。取值如下：

true：启用互联网搜索，模型会将搜索结果作为文本生成过程中的参考信息，但模型会基于其内部逻辑判断是否使用互联网搜索结果。

如果模型没有搜索互联网，建议优化Prompt，或设置search_options中的forced_search参数开启强制搜索。
false（默认）：关闭互联网搜索。

计费信息请参见计费说明。

支持的模型

Java SDK中为enableSearch。通过HTTP调用时，请将 enable_search 放入 parameters 对象中。
启用互联网搜索功能可能会增加 Token 的消耗。
search_options object （可选）

联网搜索的策略。仅当enable_search为true时生效。详情参见联网搜索。

通过HTTP调用时，请将 search_options 放入 parameters 对象中。Java SDK中为searchOptions。
属性

asr_options object （可选）

该参数仅在调用录音文件识别-通义千问功能时可用，且仅对通义千问3 ASR模型生效，用来指定某些功能是否启用。具体用法请参见快速开始。

通过HTTP或Java SDK调用时，请将 asr_options 放入 parameters 对象中。
属性

X-DashScope-DataInspection string （可选）

在通义千问 API 的内容安全能力基础上，是否进一步识别输入输出内容的违规信息。取值如下：

'{"input":"cip","output":"cip"}'：进一步识别；

不设置该参数：不进一步识别。

通过 HTTP 调用时请放入请求头：-H "X-DashScope-DataInspection: {\"input\": \"cip\", \"output\": \"cip\"}"；

通过 Python SDK 调用时请通过headers配置：headers={'X-DashScope-DataInspection': '{"input":"cip","output":"cip"}'}。

详细使用方法请参见内容审核。

不支持通过 Java SDK 设置。
不适用于 Qwen-VL、Qwen-Audio 系列模型。
chat响应对象（流式与非流式输出格式一致）
 
{
  "status_code": 200,
  "request_id": "902fee3b-f7f0-9a8c-96a1-6b4ea25af114",
  "code": "",
  "message": "",
  "output": {
    "text": null,
    "finish_reason": null,
    "choices": [
      {
        "finish_reason": "stop",
        "message": {
          "role": "assistant",
          "content": "我是阿里云开发的一款超大规模语言模型，我叫通义千问。"
        }
      }
    ]
  },
  "usage": {
    "input_tokens": 22,
    "output_tokens": 17,
    "total_tokens": 39
  }
}
status_code string

本次请求的状态码。200 表示请求成功，否则表示请求失败。

Java SDK不会返回该参数。调用失败会抛出异常，异常信息为status_code和message的内容。
request_id string

本次调用的唯一标识符。

Java SDK返回参数为requestId。
code string

错误码，调用成功时为空值。

只有Python SDK返回该参数。
output object

调用结果信息。

属性

usage map

本次chat请求使用的Token信息。

属性