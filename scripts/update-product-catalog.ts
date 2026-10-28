import { PrismaClient } from '@prisma/client';
import { currentProducts } from '../src/lib/product-catalog';
const db = new PrismaClient();
async function main() {
 const result = await db.$transaction(async tx => {
  const retired = await tx.product.updateMany({where:{slug:{notIn:currentProducts.map(p=>p.slug)}},data:{active:false}});
  for (const p of currentProducts) {
   const {id,stock,...details}=p;
   await tx.product.upsert({where:{slug:p.slug},create:p,update:details});
  }
  return {retired:retired.count,products:await tx.product.findMany({where:{active:true},select:{slug:true,price:true,stock:true}})};
 },{timeout:30000});
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error('Catalog update failed:',e.code || e.name);process.exitCode=1}).finally(()=>db.$disconnect());
