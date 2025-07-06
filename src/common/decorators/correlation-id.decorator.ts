import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the correlation ID from the request
 * Usage: @CorrelationId() correlationId: string
 */
export const CorrelationId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.correlationId;
    },
); 