local limit = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
if not limit or limit < 1 or limit ~= math.floor(limit)
   or not window_ms or window_ms < 1 or window_ms ~= math.floor(window_ms)
   or limit > 1000000 or window_ms > 86400000 then
    return redis.error_reply('limit/window_ms out of range')
end

local count = redis.call('INCR', KEYS[1])
if count == 1 then
    redis.call('PEXPIRE', KEYS[1], window_ms)
end
local allowed = 0
if count <= limit then
    allowed = 1
end
return {allowed, count, redis.call('PTTL', KEYS[1])}
