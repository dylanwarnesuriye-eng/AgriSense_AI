"""API endpoints for Fertilizer Advisory (Rule-Based Knowledge System)."""
from fastapi import APIRouter

from app.modules.fertilizer_advisory import (
    FERTILIZER_PRODUCTS,
    FERTILIZER_RULES,
    AgronomicRuleDTO,
    AgronomicSourceDTO,
    FertilizerAdvisoryInput,
    FertilizerAdvisoryOutput,
    FertilizerProductDTO,
    fertilizer_service,
    list_sources,
)
from app.schemas.common import BaseResponse

router = APIRouter()


@router.post(
    "/diagnose",
    response_model=BaseResponse[FertilizerAdvisoryOutput],
    summary="Diagnose soil nutrient needs and calculate fertilizer application rates",
)
async def diagnose_fertilizer(payload: FertilizerAdvisoryInput):
    """Run forward-chaining expert evaluation on soil NPK levels and calculate safeguarded product rates."""
    advisory = fertilizer_service.generate_advisory(payload)
    return BaseResponse(
        data=advisory,
        message="Fertilizer advisory evaluated successfully.",
    )


@router.get(
    "/rules",
    response_model=BaseResponse[list[AgronomicRuleDTO]],
    summary="List registered agronomic production rules and approval statuses",
)
async def list_agronomic_rules():
    """Return all production rules with source provenance, precedence, and approval statuses."""
    rule_dtos = [
        AgronomicRuleDTO(
            rule_id=r.rule_id,
            crop=r.crop,
            region=r.region,
            cultivation_condition=r.cultivation_condition,
            growth_stage=r.growth_stage,
            antecedents=r.antecedents,
            consequent_nutrients_kgha=r.consequent_nutrients_kgha,
            consequent_recommendation=r.consequent_recommendation,
            precedence=r.precedence,
            evidence_source_id=r.evidence_source_id,
            approval_status=r.approval_status,
            version=r.version,
        )
        for r in FERTILIZER_RULES
    ]
    return BaseResponse(
        data=rule_dtos,
        message="Agronomic rules retrieved successfully.",
    )


@router.get(
    "/references",
    response_model=BaseResponse[list[AgronomicSourceDTO]],
    summary="List authoritative agronomic literature references",
)
async def list_literature_references():
    """Return registered reference sources from the Department of Agriculture and FAO."""
    sources = list_sources()
    source_dtos = [
        AgronomicSourceDTO(
            source_id=s.source_id,
            institution=s.institution,
            publication_title=s.publication_title,
            document_reference=s.document_reference,
            publication_year=s.publication_year,
            applicable_crops=s.applicable_crops,
            geographic_applicability=s.geographic_applicability,
            review_status=s.review_status,
            rule_version=s.rule_version,
            notes=s.notes,
        )
        for s in sources
    ]
    return BaseResponse(
        data=source_dtos,
        message="Literature references retrieved successfully.",
    )


@router.get(
    "/products",
    response_model=BaseResponse[list[FertilizerProductDTO]],
    summary="List standard commercial fertilizer products and nutrient contents",
)
async def list_fertilizer_products():
    """Return standard fertilizer products with N-P2O5-K2O percentage grades."""
    product_dtos = [
        FertilizerProductDTO(
            name=p.name,
            grade=p.grade,
            n_percent=p.n_percent,
            p2o5_percent=p.p2o5_percent,
            k2o_percent=p.k2o_percent,
            description=p.description,
        )
        for p in FERTILIZER_PRODUCTS.values()
    ]
    return BaseResponse(
        data=product_dtos,
        message="Fertilizer products retrieved successfully.",
    )
