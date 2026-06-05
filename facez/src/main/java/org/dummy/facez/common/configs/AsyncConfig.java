package org.dummy.facez.common.configs;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Enables Spring @Async support and defines thread pools.
 *
 * How @Async works:
 *  - Spring wraps beans that have @Async methods in a proxy.
 *  - When an external caller invokes the method, the proxy intercepts it
 *    and submits the work to the named executor instead of running inline.
 *  - The calling thread returns immediately (for void methods).
 *  - IMPORTANT: self-invocation (calling an @Async method on `this`)
 *    bypasses the proxy — the method runs synchronously. Always call
 *    @Async methods via an injected bean reference, never via `this.method()`.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Dedicated thread pool for payroll batch jobs.
     *
     * Sizing rationale for an HRMS:
     *  - corePoolSize=2   : two batch runs can execute concurrently (e.g. two months in parallel)
     *  - maxPoolSize=4    : burst capacity for ad-hoc retriggers
     *  - queueCapacity=10 : up to 10 requests wait before CallerRunsPolicy applies
     *  - CallerRunsPolicy : if the queue is full, the HTTP thread runs the job itself —
     *                       this throttles the caller instead of dropping requests.
     */
    @Bean("payrollExecutor")
    public Executor payrollExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("payroll-batch-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
