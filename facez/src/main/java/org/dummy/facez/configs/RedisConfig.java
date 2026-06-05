package org.dummy.facez.configs;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializer;

@Configuration
public class RedisConfig {
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> tpl = new RedisTemplate<>();
        tpl.setConnectionFactory(factory);
        tpl.setKeySerializer(RedisSerializer.string());
        tpl.setHashKeySerializer(RedisSerializer.string());
        tpl.setValueSerializer(RedisSerializer.json());
        tpl.afterPropertiesSet();
        return tpl;
    }
}
