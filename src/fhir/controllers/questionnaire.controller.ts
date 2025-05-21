import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Role, Action } from '../../auth/guards/roles.guard';
import { Roles, ResourcePermission } from '../../auth/decorators/roles.decorator';
import { QuestionnaireService } from '../services/questionnaire.service';


@ApiTags('questionnaires')
@Controller('questionnaires')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuestionnaireController {
    constructor(private readonly questionnaireService: QuestionnaireService) { }

    @Get()
    @ApiOperation({ summary: 'Get all questionnaires with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiQuery({ name: 'title', required: false, description: 'Filter by title' })
    @ApiResponse({ status: 200, description: 'List of questionnaires' })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('title') title?: string,
    ) {
        // If title is provided, filter by title
        if (title) {
            return this.questionnaireService.findByTitle(title);
        }

        // Otherwise use standard pagination
        return this.questionnaireService.findAll({
            page: +page,
            limit: +limit,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get questionnaire by ID' })
    @ApiParam({ name: 'id', description: 'Questionnaire ID' })
    @ApiResponse({ status: 200, description: 'The questionnaire' })
    @ApiResponse({ status: 404, description: 'Questionnaire not found' })
    async findOne(@Param('id') id: string) {
        return this.questionnaireService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Create new questionnaire' })
    @ApiResponse({ status: 201, description: 'Questionnaire created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async create(@Body() data: any) {
        return this.questionnaireService.create(data);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.PRACTITIONER)
    @ApiOperation({ summary: 'Update questionnaire by ID' })
    @ApiParam({ name: 'id', description: 'Questionnaire ID' })
    @ApiResponse({ status: 200, description: 'Questionnaire updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Questionnaire not found' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.questionnaireService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete questionnaire by ID' })
    @ApiParam({ name: 'id', description: 'Questionnaire ID' })
    @ApiResponse({ status: 200, description: 'Questionnaire deleted successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    @ApiResponse({ status: 404, description: 'Questionnaire not found' })
    async remove(@Param('id') id: string) {
        return this.questionnaireService.remove(id);
    }
} 